import { MongoClient } from 'mongodb';

let client;
let db;
let historyCollection;

const MAX_MESSAGES_PER_USER = 10; // Maximum messages to keep per user

/**
 * Initialize MongoDB connection
 * @param {string} uri - MongoDB Atlas connection string
 */
export async function initMongoDB(uri) {
    try {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db('thanos_bot_chats'); // Database name
        historyCollection = db.collection('chat_history');
        
        // Create index on user_id for faster queries
        await historyCollection.createIndex({ user_id: 1, created_at: -1 });
        
        console.log('✅ MongoDB connected and chat history collection initialized');
    } catch (error) {
        console.error('❌ Failed to initialize MongoDB:', error);
        throw error;
    }
}

/**
 * Maintains cache limit by deleting oldest messages when limit is exceeded
 * @param {string} userId - Unique identifier for the user
 */
async function maintainCacheLimit(userId) {
    try {
        const count = await historyCollection.countDocuments({ user_id: userId });
        
        if (count > MAX_MESSAGES_PER_USER) {
            // Get the oldest messages to delete
            const excessCount = count - MAX_MESSAGES_PER_USER;
            
            const oldestMessages = await historyCollection
                .find({ user_id: userId })
                .sort({ created_at: 1 })
                .limit(excessCount)
                .toArray();
            
            const idsToDelete = oldestMessages.map(msg => msg._id);
            
            if (idsToDelete.length > 0) {
                const result = await historyCollection.deleteMany({
                    _id: { $in: idsToDelete }
                });
                
                console.log(`🗑️ Cache cleanup: Deleted ${result.deletedCount} old messages for ${userId}`);
            }
        }
    } catch (error) {
        console.error(`❌ Failed to maintain cache limit for ${userId}:`, error);
    }
}

/**
 * Adds a message to the chat history
 * @param {string} userId - Unique identifier for the user (phone number)
 * @param {string} role - Either 'user' or 'assistant'
 * @param {string} content - The message content
 */
export async function addMessage(userId, role, content) {
    try {
        await historyCollection.insertOne({
            user_id: userId,
            role: role,
            content: content,
            created_at: new Date()
        });
        
        // Maintain cache limit after adding new message
        await maintainCacheLimit(userId);
    } catch (error) {
        console.error(`❌ Failed to add message for ${userId}:`, error);
        throw error;
    }
}

/**
 * Gets recent chat history for a specific user
 * @param {string} userId - Unique identifier for the user
 * @param {number} limit - Maximum number of messages to retrieve (default: 10)
 * @returns {Array} Array of {role, content} objects
 */
export async function getHistory(userId, limit = 10) {
    try {
        const messages = await historyCollection
            .find({ user_id: userId })
            .sort({ created_at: -1 })
            .limit(limit)
            .toArray();
        
        // Reverse to get chronological order (oldest first)
        return messages.reverse().map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    } catch (error) {
        console.error(`❌ Failed to get history for ${userId}:`, error);
        return [];
    }
}

/**
 * Clears all chat history for a specific user (starts a new thread)
 * @param {string} userId - Unique identifier for the user
 */
export async function clearHistory(userId) {
    try {
        const result = await historyCollection.deleteMany({ user_id: userId });
        console.log(`🗑️ Cleared ${result.deletedCount} messages for ${userId} - New thread started`);
    } catch (error) {
        console.error(`❌ Failed to clear history for ${userId}:`, error);
        throw error;
    }
}

/**
 * Deletes old chat history (older than X days)
 * @param {number} days - Number of days to keep history for
 */
export async function cleanOldHistory(days = 30) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const result = await historyCollection.deleteMany({
            created_at: { $lt: cutoffDate }
        });
        
        console.log(`🧹 Cleaned ${result.deletedCount} old messages (older than ${days} days)`);
    } catch (error) {
        console.error('❌ Failed to clean old history:', error);
        throw error;
    }
}

/**
 * Gets the total number of messages for a user
 * @param {string} userId - Unique identifier for the user
 * @returns {number} Total message count
 */
export async function getMessageCount(userId) {
    try {
        const count = await historyCollection.countDocuments({ user_id: userId });
        return count;
    } catch (error) {
        console.error(`❌ Failed to get message count for ${userId}:`, error);
        return 0;
    }
}

/**
 * Formats history for the AI prompt
 * @param {Array} history - Array of {role, content} objects
 * @returns {string} Formatted string for system prompt
 */
export function formatHistoryForPrompt(history) {
    if (!history || history.length === 0) {
        return 'This is the start of your conversation with this user.';
    }
    
    const formatted = history
        .map(msg => `${msg.role === 'user' ? 'User' : 'You'}: ${msg.content}`)
        .join('\n');
    
    return `Previous conversation:\n${formatted}\n\nRespond to the user's latest message naturally, keeping the conversation context in mind.`;
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDB() {
    if (client) {
        await client.close();
        console.log('✅ MongoDB connection closed');
    }
}