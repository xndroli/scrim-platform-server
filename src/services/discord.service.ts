// src/services/discord.service.ts
import { 
  Client, 
  GatewayIntentBits, 
  ChannelType, 
  VoiceChannel,
  TextChannel,
  Guild,
  GuildMember,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CategoryChannel,
  ColorResolvable
} from 'discord.js';
import { config } from '../config/environment';
import { db } from '../db';
import { scrims, user } from '../db/schema';
import { eq } from 'drizzle-orm';

export class DiscordService {
  private client: Client;
  private guild: Guild | undefined;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages
      ],
    });

    this.setupEventHandlers();
  }

  async initialize() {
    try {
      await this.client.login(config.DISCORD_BOT_TOKEN);
      console.log('✅ Discord bot logged in successfully');
      
      this.guild = this.client.guilds.cache.get(config.DISCORD_GUILD_ID);
      if (!this.guild) {
        throw new Error('Guild not found');
      }
      
      await this.setupGuildStructure();
    } catch (error) {
      console.error('❌ Discord bot initialization failed:', error);
      throw error;
    }
  }

  private setupEventHandlers() {
    this.client.on('ready', () => {
      console.log(`🤖 Discord bot ready as ${this.client.user?.tag}`);
    });

    this.client.on('guildMemberAdd', this.handleMemberJoin.bind(this));
    this.client.on('voiceStateUpdate', this.handleVoiceStateUpdate.bind(this));
    this.client.on('interactionCreate', this.handleInteraction.bind(this));
  }

  private async setupGuildStructure() {
    if (!this.guild) return;

    try {
      // Create scrim categories if they don't exist
      const scrimCategory = await this.findOrCreateCategory('SCRIMS');
      const teamCategory = await this.findOrCreateCategory('TEAM CHANNELS');
      
      // Create roles
      await this.createRoles();
      
      console.log('✅ Guild structure setup complete');
    } catch (error) {
      console.error('❌ Guild structure setup failed:', error);
    }
  }

  private async findOrCreateCategory(name: string): Promise<CategoryChannel> {
    if (!this.guild) throw new Error('Guild not initialized');

    let category = this.guild.channels.cache.find(
      channel => channel.type === ChannelType.GuildCategory && channel.name === name
    ) as CategoryChannel;

    if (!category) {
      category = await this.guild.channels.create({
        name,
        type: ChannelType.GuildCategory,
      });
    }

    return category;
  }

  private async createRoles() {
    if (!this.guild) return;

    const rolesToCreate = [
      { name: 'Scrim Participant', color: '#00ff00', permissions: [] },
      { name: 'Team Captain', color: '#ffaa00', permissions: [] },
      { name: 'Match Organizer', color: '#ff0000', permissions: ['ManageChannels'] },
      { name: 'Apex Player', color: '#ff6600', permissions: [] },
      { name: 'Tournament Winner', color: '#ffd700', permissions: [] }
    ];

    for (const roleData of rolesToCreate) {
      const existingRole = this.guild.roles.cache.find(role => role.name === roleData.name);
      if (!existingRole) {
        await this.guild.roles.create({
          name: roleData.name,
          color: roleData.color as any,
          permissions: roleData.permissions as any,
          reason: 'Scrim platform role creation'
        });
      }
    }
  }

  // Scrim Management Methods
  async createScrimChannels(scrimId: number, scrimTitle: string, maxTeams: number) {
    if (!this.guild) throw new Error('Guild not initialized');

    try {
      const scrimCategory = await this.findOrCreateCategory('SCRIMS');
      
      // Create text channel for scrim coordination
      const textChannel = await this.guild.channels.create({
        name: `scrim-${scrimId}-${scrimTitle.toLowerCase().replace(/\s+/g, '-')}`,
        type: ChannelType.GuildText,
        parent: scrimCategory.id,
        topic: `Scrim: ${scrimTitle} | Max Teams: ${maxTeams}`,
      });

      // Create voice channels for each team
      const voiceChannels = [];
      for (let i = 1; i <= maxTeams; i++) {
        const voiceChannel = await this.guild.channels.create({
          name: `Team ${i} Voice`,
          type: ChannelType.GuildVoice,
          parent: scrimCategory.id,
          userLimit: 3, // Standard Apex team size
        });
        voiceChannels.push(voiceChannel);
      }

      // Send welcome message with scrim info
      await this.sendScrimWelcomeMessage(textChannel, scrimId, scrimTitle);

      return {
        textChannelId: textChannel.id,
        voiceChannelIds: voiceChannels.map(vc => vc.id),
      };
    } catch (error) {
      console.error('❌ Failed to create scrim channels:', error);
      throw error;
    }
  }

  private async sendScrimWelcomeMessage(channel: TextChannel, scrimId: number, scrimTitle: string) {
    const embed = new EmbedBuilder()
      .setTitle(`🎮 Scrim: ${scrimTitle}`)
      .setDescription('Welcome to your scrim! Use the buttons below to manage your participation.')
      .setColor('#00ff00')
      .addFields(
        { name: 'Scrim ID', value: scrimId.toString(), inline: true },
        { name: 'Status', value: 'Waiting for teams', inline: true }
      )
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`join_scrim_${scrimId}`)
          .setLabel('Join Scrim')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`leave_scrim_${scrimId}`)
          .setLabel('Leave Scrim')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌'),
        new ButtonBuilder()
          .setCustomId(`scrim_info_${scrimId}`)
          .setLabel('Scrim Info')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('ℹ️')
      );

    await channel.send({ embeds: [embed], components: [row] });
  }

  async assignUserRoles(discordId: string, userId: string) {
  const member = await this.getGuildMemberByUserId(discordId);
  if (member) {
    const participantRole = this.guild?.roles.cache.find(r => r.name === 'Scrim Participant');
    if (participantRole) {
      await member.roles.add(participantRole);
    }
  }
}

async assignApexRole(discordId: string) {
  const member = await this.getGuildMemberByUserId(discordId);
  if (member) {
    const apexRole = this.guild?.roles.cache.find(r => r.name === 'Apex Player');
    if (apexRole) {
      await member.roles.add(apexRole);
    }
  }
}

  async assignTeamRoles(userId: string, teamId: number, role: 'player' | 'captain') {
    if (!this.guild) throw new Error('Guild not initialized');

    try {
      const member = await this.guild.members.fetch(userId);
      if (!member) return;

      // Remove previous team roles
      const teamRoles = this.guild.roles.cache.filter(r => r.name.startsWith('Team-'));
      await member.roles.remove(teamRoles);

      // Add new team role
      const teamRoleName = `Team-${teamId}`;
      let teamRole = this.guild.roles.cache.find(r => r.name === teamRoleName);
      
      if (!teamRole) {
        teamRole = await this.guild.roles.create({
          name: teamRoleName,
          color: this.getRandomColor(),
          reason: `Team ${teamId} role creation`
        });
      }

      await member.roles.add(teamRole);

      // Add captain role if applicable
      if (role === 'captain') {
        const captainRole = this.guild.roles.cache.find(r => r.name === 'Team Captain');
        if (captainRole) {
          await member.roles.add(captainRole);
        }
      }

      // Add scrim participant role
      const participantRole = this.guild.roles.cache.find(r => r.name === 'Scrim Participant');
      if (participantRole) {
        await member.roles.add(participantRole);
      }

    } catch (error) {
      console.error('❌ Failed to assign team roles:', error);
    }
  }

  async moveToTeamVoice(userId: string, teamNumber: number, scrimId: number) {
    if (!this.guild) throw new Error('Guild not initialized');

    try {
      const member = await this.guild.members.fetch(userId);
      if (!member.voice.channel) return; // User not in voice

      // Find the team's voice channel
      const teamVoiceChannel = this.guild.channels.cache.find(
        channel => 
          channel.type === ChannelType.GuildVoice && 
          channel.name === `Team ${teamNumber} Voice` &&
          channel.parent?.name === 'SCRIMS'
      ) as VoiceChannel;

      if (teamVoiceChannel) {
        await member.voice.setChannel(teamVoiceChannel);
      }
    } catch (error) {
      console.error('❌ Failed to move user to team voice:', error);
    }
  }

  async sendMatchNotification(scrimId: number, message: string, mentionRoles: string[] = []) {
    if (!this.guild) return;

    try {
      // Find scrim text channel
      const scrimChannel = this.guild.channels.cache.find(
        channel => 
          channel.type === ChannelType.GuildText && 
          channel.name.includes(`scrim-${scrimId}`)
      ) as TextChannel;

      if (!scrimChannel) return;

      const embed = new EmbedBuilder()
        .setTitle('📢 Match Notification')
        .setDescription(message)
        .setColor('#ff6600')
        .setTimestamp();

      const mentions = mentionRoles.map(roleId => `<@&${roleId}>`).join(' ');
      
      await scrimChannel.send({ 
        content: mentions || undefined, 
        embeds: [embed] 
      });
    } catch (error) {
      console.error('❌ Failed to send match notification:', error);
    }
  }

  async updateScrimStatus(scrimId: number, status: string, additionalInfo?: string) {
    if (!this.guild) return;

    try {
      const scrimChannel = this.guild.channels.cache.find(
        channel => 
          channel.type === ChannelType.GuildText && 
          channel.name.includes(`scrim-${scrimId}`)
      ) as TextChannel;

      if (!scrimChannel) return;

      const embed = new EmbedBuilder()
        .setTitle('🔄 Scrim Status Update')
        .addFields(
          { name: 'Status', value: status, inline: true },
          { name: 'Scrim ID', value: scrimId.toString(), inline: true }
        )
        .setColor('#0099ff')
        .setTimestamp();

      if (additionalInfo) {
        embed.setDescription(additionalInfo);
      }

      await scrimChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Failed to update scrim status:', error);
    }
  }

  async cleanupScrimChannels(scrimId: number) {
    if (!this.guild) return;

    try {
      // Find and delete scrim channels
      const channelsToDelete = this.guild.channels.cache.filter(
        channel => channel.name.includes(`scrim-${scrimId}`)
      );

      for (const channel of channelsToDelete.values()) {
        await channel.delete('Scrim completed - cleanup');
      }

      // Clean up team roles if no other scrims are using them
      await this.cleanupUnusedTeamRoles();
    } catch (error) {
      console.error('❌ Failed to cleanup scrim channels:', error);
    }
  }

  private async cleanupUnusedTeamRoles() {
    if (!this.guild) return;

    try {
      const teamRoles = this.guild.roles.cache.filter(role => role.name.startsWith('Team-'));
      
      for (const role of teamRoles.values()) {
        if (role.members.size === 0) {
          await role.delete('Unused team role cleanup');
        }
      }
    } catch (error) {
      console.error('❌ Failed to cleanup unused team roles:', error);
    }
  }

  // Event Handlers
  private async handleMemberJoin(member: GuildMember) {
    try {
      // Check if user exists in database and assign appropriate roles
      const userData = await db.select()
        .from(user)
        .where(eq(user.discordId, member.id))
        .limit(1);

      if (userData.length > 0) {
        // User is registered, give them basic roles
        const participantRole = this.guild?.roles.cache.find(r => r.name === 'Scrim Participant');
        if (participantRole) {
          await member.roles.add(participantRole);
        }

        // Check if they're linked to Apex
        if (userData[0].apexPlayerId) {
          const apexRole = this.guild?.roles.cache.find(r => r.name === 'Apex Player');
          if (apexRole) {
            await member.roles.add(apexRole);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to handle member join:', error);
    }
  }

  private async handleVoiceStateUpdate(oldState: any, newState: any) {
    // Handle voice channel events (optional advanced feature)
    // Could be used for automatic team voice channel management
  }

  private async handleInteraction(interaction: any) {
    if (!interaction.isButton()) return;

    const [action, type, id] = interaction.customId.split('_');
    
    try {
      switch (type) {
        case 'scrim':
          await this.handleScrimInteraction(interaction, action, parseInt(id));
          break;
        default:
          await interaction.reply({ content: 'Unknown interaction', ephemeral: true });
      }
    } catch (error) {
      console.error('❌ Failed to handle interaction:', error);
      await interaction.reply({ content: 'An error occurred', ephemeral: true });
    }
  }

  private async handleScrimInteraction(interaction: any, action: string, scrimId: number) {
    switch (action) {
      case 'join':
        await this.handleJoinScrim(interaction, scrimId);
        break;
      case 'leave':
        await this.handleLeaveScrim(interaction, scrimId);
        break;
      case 'info':
        await this.handleScrimInfo(interaction, scrimId);
        break;
    }
  }

  private async handleJoinScrim(interaction: any, scrimId: number) {
    const userId = interaction.user.id;
    
    // Check if user is registered and linked
    const userData = await db.select()
      .from(user)
      .where(eq(user.discordId, userId))
      .limit(1);

    if (userData.length === 0) {
      await interaction.reply({
        content: '❌ You must register on the platform and link your Discord account first!',
        ephemeral: true
      });
      return;
    }

    if (!userData[0].apexPlayerId) {
      await interaction.reply({
        content: '❌ You must link your Apex Legends account to participate in scrims!',
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content: '✅ Join request received! Please use the website to officially join with your team.',
      ephemeral: true
    });
  }

  private async handleLeaveScrim(interaction: any, scrimId: number) {
    await interaction.reply({
      content: '✅ Leave request received! Please use the website to officially leave the scrim.',
      ephemeral: true
    });
  }

  private async handleScrimInfo(interaction: any, scrimId: number) {
    try {
      const scrimData = await db.select()
        .from(scrims)
        .where(eq(scrims.id, scrimId))
        .limit(1);

      if (scrimData.length === 0) {
        await interaction.reply({
          content: '❌ Scrim not found!',
          ephemeral: true
        });
        return;
      }

      const scrim = scrimData[0];
      const embed = new EmbedBuilder()
        .setTitle(`📊 Scrim Info: ${scrim.title}`)
        .addFields(
          { name: 'Game', value: scrim.game, inline: true },
          { name: 'Scheduled', value: new Date(scrim.scheduledAt).toLocaleString(), inline: true },
          { name: 'Status', value: scrim.status, inline: true },
          { name: 'Max Teams', value: scrim.maxTeams.toString(), inline: true }
        )
        .setColor('#0099ff')
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to fetch scrim info!',
        ephemeral: true
      });
    }
  }

  // Utility Methods
  private getRandomColor(): ColorResolvable {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }

  async getGuildMemberByUserId(userId: string): Promise<GuildMember | null> {
    if (!this.guild) return null;
    
    try {
      return await this.guild.members.fetch(userId);
    } catch {
      return null;
    }
  }
}

// Singleton instance
export const discordService = new DiscordService();