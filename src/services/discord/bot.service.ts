// src/services/discord/bot.service.ts
import { Client, GatewayIntentBits, REST, Routes, ChannelType, PermissionFlagsBits } from 'discord.js';
import { config } from '../../config/environment';
import { db } from '../../db';
import { discordServers, discordChannels, userDiscordAccounts } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class DiscordBotService {
  private client: Client;
  private rest: REST;
  private isReady: boolean = false;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });

    this.rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);
    this.initialize();
  }

  private async initialize() {
    // Register slash commands
    await this.registerCommands();
    
    // Set up event handlers
    this.client.on('ready', () => {
      console.log(`Discord bot logged in as ${this.client.user?.tag}`);
      this.isReady = true;
    });

    this.client.on('guildCreate', async (guild) => {
      await this.setupGuild(guild.id);
    });

    this.client.on('voiceStateUpdate', async (oldState, newState) => {
      await this.handleVoiceUpdate(oldState, newState);
    });

    // Login
    await this.client.login(config.DISCORD_BOT_TOKEN);
  }

  private async registerCommands() {
    const commands = [
      {
        name: 'link-apex',
        description: 'Link your Apex Legends account',
        options: [
          {
            name: 'username',
            type: 3, // STRING
            description: 'Your Apex Legends username',
            required: true,
          },
          {
            name: 'platform',
            type: 3, // STRING
            description: 'Your gaming platform',
            required: true,
            choices: [
              { name: 'PC (Origin/Steam)', value: 'PC' },
              { name: 'PlayStation', value: 'PS4' },
              { name: 'Xbox', value: 'X1' },
            ],
          },
        ],
      },
      {
        name: 'scrim-info',
        description: 'Get information about the current scrim',
      },
      {
        name: 'ready',
        description: 'Mark yourself as ready for the scrim',
      },
    ];

    try {
      await this.rest.put(
        Routes.applicationCommands(config.DISCORD_CLIENT_ID),
        { body: commands }
      );
    } catch (error) {
      console.error('Failed to register Discord commands:', error);
    }
  }

  async setupGuild(guildId: string) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      
      // Create scrim category
      const category = await guild.channels.create({
        name: 'Scrims',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
      });

      // Create roles
      const participantRole = await guild.roles.create({
        name: 'Scrim Participant',
        color: '#5865F2',
        reason: 'Auto-created for scrim management',
      });

      const coachRole = await guild.roles.create({
        name: 'Scrim Coach',
        color: '#EB459E',
        reason: 'Auto-created for scrim management',
      });

      // Store in database
      await db.insert(discordServers).values({
        guildId: guild.id,
        guildName: guild.name,
        categoryId: category.id,
        participantRoleId: participantRole.id,
        coachRoleId: coachRole.id,
      });

      return { category, participantRole, coachRole };
    } catch (error) {
      console.error('Failed to setup Discord guild:', error);
      throw error;
    }
  }

  async createScrimChannels(scrimId: number, guildId: string) {
    const guild = await this.client.guilds.fetch(guildId);
    const serverConfig = await db.select()
      .from(discordServers)
      .where(eq(discordServers.guildId, guildId))
      .limit(1);

    if (!serverConfig[0]) {
      throw new Error('Server not configured');
    }

    const { categoryId, participantRoleId } = serverConfig[0];

    // Create text channel for scrim
    const textChannel = await guild.channels.create({
      name: `scrim-${scrimId}`,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: participantRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ],
    });

    // Create voice channels for teams
    const voiceChannels = [];
    for (let i = 1; i <= 20; i++) {
      const vc = await guild.channels.create({
        name: `Team ${i}`,
        type: ChannelType.GuildVoice,
        parent: categoryId,
        userLimit: 3, // Apex squad size
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: participantRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          },
        ],
      });
      voiceChannels.push(vc);
    }

    // Store channel IDs
    await db.insert(discordChannels).values({
      scrimId,
      guildId,
      textChannelId: textChannel.id,
      voiceChannelIds: voiceChannels.map(vc => vc.id),
    });

    return { textChannel, voiceChannels };
  }

  async assignTeamToVoiceChannel(userId: string, teamId: number, scrimId: number) {
    try {
      const userDiscord = await db.select()
        .from(userDiscordAccounts)
        .where(eq(userDiscordAccounts.userId, userId))
        .limit(1);

      if (!userDiscord[0]) {
        throw new Error('User has not linked Discord account');
      }

      const channels = await db.select()
        .from(discordChannels)
        .where(eq(discordChannels.scrimId, scrimId))
        .limit(1);

      if (!channels[0]) {
        throw new Error('Scrim channels not found');
      }

      const guild = await this.client.guilds.fetch(channels[0].guildId);
      const member = await guild.members.fetch(userDiscord[0].discordId);
      
      // Move to appropriate voice channel
      const voiceChannelId = channels[0].voiceChannelIds[teamId - 1];
      if (member.voice.channel) {
        await member.voice.setChannel(voiceChannelId);
      }

      return true;
    } catch (error) {
      console.error('Failed to assign voice channel:', error);
      throw error;
    }
  }

  async sendScrimNotification(scrimId: number, message: string) {
    const channels = await db.select()
      .from(discordChannels)
      .where(eq(discordChannels.scrimId, scrimId))
      .limit(1);

    if (!channels[0]) return;

    const channel = await this.client.channels.fetch(channels[0].textChannelId);
    if (channel?.isTextBased()) {
      await channel.send({
        embeds: [{
          color: 0x5865F2,
          title: '🎮 Scrim Update',
          description: message,
          timestamp: new Date().toISOString(),
        }],
      });
    }
  }

  async cleanupScrimChannels(scrimId: number) {
    const channels = await db.select()
      .from(discordChannels)
      .where(eq(discordChannels.scrimId, scrimId))
      .limit(1);

    if (!channels[0]) return;

    try {
      // Delete text channel
      const textChannel = await this.client.channels.fetch(channels[0].textChannelId);
      if (textChannel) await textChannel.delete();

      // Delete voice channels
      for (const vcId of channels[0].voiceChannelIds) {
        const vc = await this.client.channels.fetch(vcId);
        if (vc) await vc.delete();
      }

      // Remove from database
      await db.delete(discordChannels)
        .where(eq(discordChannels.scrimId, scrimId));
    } catch (error) {
      console.error('Failed to cleanup channels:', error);
    }
  }
}

// Initialize bot service
export const discordBot = new DiscordBotService();