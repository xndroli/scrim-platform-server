// Make this file a module by adding an export
export {};

// Extend Express Request interface
declare global {
  namespace Express {
    // Use a more generic type to avoid conflicts
    interface Request {
      user?: any;
    }
  }
}
