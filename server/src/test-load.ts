import { io as ClientSocket, Socket } from 'socket.io-client';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { UserModel } from './models/user.model';
import { WorkspaceModel } from './models/workspace.model';
import { MessageModel } from './models/message.model';
import { redisClient, isRedisConnected } from './config/redis';
import { inMemoryOnlineUsers } from './controllers/presence.controller';

const MOCK_USER_COUNT = 50;
const TEST_PORT = env.PORT || 5000;
const SOCKET_SERVER_URL = `http://localhost:${TEST_PORT}`;

interface ConnectionMetric {
  socketId: string;
  latencyMs: number;
  success: boolean;
}

async function runPerformanceAudit() {
  console.log('🏁 [Performance Audit] Starting connection and memory profiling audit...');
  console.log(`📡 URL target: ${SOCKET_SERVER_URL}`);

  // 1. Establish database connection
  if (mongoose.connection.readyState === 0) {
    const mongoUri = env.MONGO_URI || 'mongodb://127.0.0.1:27017/slacknotion';
    console.log(`📥 [DB] Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('✅ [DB] Connected to MongoDB.');
  }

  // 2. Clear out any previous remnants of load test entries
  await cleanUpDatabase();

  // 3. Create mock users and workspace
  console.log(`👤 [DB] Creating ${MOCK_USER_COUNT} mock load test users in database...`);
  const mockUsers: any[] = [];
  const userIds: mongoose.Types.ObjectId[] = [];
  const tokens: string[] = [];

  for (let i = 1; i <= MOCK_USER_COUNT; i++) {
    const email = `perf-user-${i}@loadtest.com`;
    const name = `Performance Tester ${i}`;
    const passwordHash = '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890'; // dummy hash

    let user = await UserModel.findOne({ email }).exec();
    if (!user) {
      user = new UserModel({
        email,
        name,
        passwordHash,
        role: 'member',
      });
      await user.save();
    }
    mockUsers.push(user);
    userIds.push(user._id as mongoose.Types.ObjectId);

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      env.JWT_SECRET
    );
    tokens.push(token);
  }

  console.log('💼 [DB] Creating Load Test Workspace...');
  const testWorkspace = new WorkspaceModel({
    name: 'Socket Load Test Workspace',
    description: 'Workspace generated dynamically for load-testing socket events',
    ownerId: userIds[0],
    members: userIds,
    channels: ['general'],
  });
  await testWorkspace.save();
  const workspaceId = testWorkspace._id.toString();

  // 4. Memory profile baseline before connection load
  const memoryBefore = process.memoryUsage();
  console.log(`📈 [Memory] Baseline Memory - Heap Used: ${(memoryBefore.heapUsed / 1024 / 1024).toFixed(2)} MB | Heap Total: ${(memoryBefore.heapTotal / 1024 / 1024).toFixed(2)} MB`);

  // 5. Connect clients concurrently
  console.log(`🔌 [Sockets] Spawning ${MOCK_USER_COUNT} concurrent client connections...`);
  const sockets: Socket[] = [];
  const metrics: ConnectionMetric[] = [];

  const connectPromises = tokens.map((token, index) => {
    return new Promise<void>((resolve) => {
      const email = mockUsers[index].email;
      const startTime = Date.now();
      
      const socket = ClientSocket(SOCKET_SERVER_URL, {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
      });

      socket.on('connect', () => {
        const latency = Date.now() - startTime;
        metrics.push({
          socketId: socket.id || 'unknown',
          latencyMs: latency,
          success: true,
        });
        sockets.push(socket);
        resolve();
      });

      socket.on('connect_error', (err) => {
        console.error(`❌ Connection failed for ${email}:`, err.message);
        metrics.push({
          socketId: 'failed',
          latencyMs: Date.now() - startTime,
          success: false,
        });
        socket.close();
        resolve(); // resolve to allow loop completion
      });
    });
  });

  const loadStartTime = Date.now();
  await Promise.all(connectPromises);
  const totalLoadTime = Date.now() - loadStartTime;

  console.log(`✅ [Sockets] Load testing initialization complete in ${totalLoadTime}ms.`);

  const successfulConnections = metrics.filter(m => m.success);
  const totalLatency = successfulConnections.reduce((sum, m) => sum + m.latencyMs, 0);
  const avgLatency = successfulConnections.length > 0 ? totalLatency / successfulConnections.length : 0;

  console.log(`📊 [Results] Successful: ${successfulConnections.length}/${MOCK_USER_COUNT} (${(successfulConnections.length/MOCK_USER_COUNT * 100).toFixed(1)}%)`);
  console.log(`📊 [Results] Average Connection Latency: ${avgLatency.toFixed(1)}ms`);

  // 6. Test Broadcast Latency
  console.log('📡 [Sockets] Measuring broadcast propagation latency across active clients...');
  let messageReceivedCount = 0;
  const broadcastStartTime = Date.now();
  let receivedTimes: number[] = [];

  // Set up listeners for the test channel message on all sockets
  sockets.forEach((s) => {
    s.on('message_received', (msg: any) => {
      if (msg.text === 'performance_load_test_broadcast') {
        const latency = Date.now() - broadcastStartTime;
        receivedTimes.push(latency);
        messageReceivedCount++;
      }
    });
  });

  // Client 1 joins channel 'general' and emits message
  const client1 = sockets[0];
  const client1User = mockUsers[0];
  console.log(`💬 Client 1 (${client1User.name}) joining #general channel room...`);
  client1.emit('join_channel', { workspaceId, channel: 'general' });

  // Let other clients join too to receive the broadcast
  sockets.slice(1).forEach((s) => {
    s.emit('join_channel', { workspaceId, channel: 'general' });
  });

  // Wait 1s for joins to register
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('💬 Client 1 emitting test broadcast message...');
  client1.emit('send_message', {
    workspaceId,
    channel: 'general',
    text: 'performance_load_test_broadcast',
  });

  // Wait for propagation
  await new Promise(resolve => setTimeout(resolve, 2000));

  const avgBroadcastLatency = receivedTimes.length > 0
    ? receivedTimes.reduce((sum, t) => sum + t, 0) / receivedTimes.length
    : 0;

  console.log(`📊 [Results] Broadcast Received: ${messageReceivedCount}/${sockets.length} sockets.`);
  console.log(`📊 [Results] Average Broadcast Propagation Latency: ${avgBroadcastLatency.toFixed(1)}ms`);

  // 7. Verify Presence count in Redis / Cache
  console.log('🌐 [Presence] Auditing active user presence records...');
  let onlinePresenceCount = 0;
  if (redisClient && isRedisConnected) {
    const redisOnlineUsers = await redisClient.smembers('online_users');
    onlinePresenceCount = redisOnlineUsers.length;
    console.log(`🔑 [Redis] online_users Set member count: ${onlinePresenceCount}`);
  } else {
    onlinePresenceCount = inMemoryOnlineUsers.size;
    console.log(`🔑 [In-Memory] online_users Set member count: ${onlinePresenceCount}`);
  }

  // 8. Memory profile under load
  const memoryUnderLoad = process.memoryUsage();
  console.log(`📈 [Memory] Peak Load Memory - Heap Used: ${(memoryUnderLoad.heapUsed / 1024 / 1024).toFixed(2)} MB | Heap Total: ${(memoryUnderLoad.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📈 [Memory] Delta Heap Expansion: +${((memoryUnderLoad.heapUsed - memoryBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`);

  // 9. Clean disconnect and test presence cleanup routines
  console.log('🔌 [Sockets] Disconnecting all load test client sockets...');
  const disconnectPromises = sockets.map(s => {
    return new Promise<void>(resolve => {
      s.on('disconnect', () => resolve());
      s.disconnect();
    });
  });
  await Promise.all(disconnectPromises);
  console.log('✅ [Sockets] All client sockets disconnected.');

  // Wait 1.5s for disconnect handlers to complete asynchronous multi-tab checks
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 10. Verify Presence count went back down
  console.log('🌐 [Presence] Auditing post-disconnect user presence records...');
  let postDisconnectPresenceCount = 0;
  if (redisClient && isRedisConnected) {
    const redisOnlineUsers = await redisClient.smembers('online_users');
    postDisconnectPresenceCount = redisOnlineUsers.length;
  } else {
    postDisconnectPresenceCount = inMemoryOnlineUsers.size;
  }
  console.log(`🔑 [Presence] Post-disconnect member count: ${postDisconnectPresenceCount}`);

  // 11. Cleanup test workspace and users from Mongoose
  await cleanUpDatabase();

  // 12. Final memory profile after garbage collection suggestions
  if (global.gc) {
    global.gc();
  }
  const memoryAfter = process.memoryUsage();
  console.log(`📈 [Memory] Post-Cleanup Memory - Heap Used: ${(memoryAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`);

  console.log('\n==================================================');
  console.log('📋 PERFORMANCE AUDIT REPORT SUMMARY');
  console.log('==================================================');
  console.log(`• Concurrent Socket Targets  : ${MOCK_USER_COUNT}`);
  console.log(`• Successful Connections     : ${successfulConnections.length}`);
  console.log(`• Connection Success Rate    : ${(successfulConnections.length / MOCK_USER_COUNT * 100).toFixed(1)}%`);
  console.log(`• Average Connect Latency    : ${avgLatency.toFixed(1)} ms`);
  console.log(`• Average Broadcast Latency  : ${avgBroadcastLatency.toFixed(1)} ms`);
  console.log(`• Initial Presence Count     : ${onlinePresenceCount}`);
  console.log(`• Post-Disconnect Presence   : ${postDisconnectPresenceCount}`);
  console.log(`• Leak Detection Check       : ${postDisconnectPresenceCount === 0 ? '🟢 CLEAN (0 online users)' : '🔴 WARNING (Online user leaks detected!)'}`);
  console.log(`• Memory Delta               : +${((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  console.log('==================================================\n');

  await mongoose.disconnect();
}

async function cleanUpDatabase() {
  console.log('🧹 [DB] Cleaning up temporary load test models...');
  try {
    const ws = await WorkspaceModel.findOne({ name: 'Socket Load Test Workspace' }).exec();
    if (ws) {
      await WorkspaceModel.deleteOne({ _id: ws._id });
    }
    // Delete all performance test users
    await UserModel.deleteMany({ email: /perf-user-.*@loadtest.com/ }).exec();
    // Delete all messages created during testing
    await MessageModel.deleteMany({ text: 'performance_load_test_broadcast' }).exec();
  } catch (err: any) {
    console.error('❌ [DB] Cleanup failed:', err.message);
  }
}

runPerformanceAudit().catch(err => {
  console.error('❌ [Performance Audit] Execution crash:', err);
  process.exit(1);
});
