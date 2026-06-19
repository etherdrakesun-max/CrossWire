import axios from 'axios';

/**
 * Verification Swarm Test Runner
 * Simulates creator attribution stream events and validates compliance routing and Circle Gateway settlement.
 *
 * Usage:
 *   npx ts-node scripts/run-swarm-test.ts
 */
async function runTest() {
  const BASE_URL = 'http://localhost:3000';
  console.log('🧪 Starting Agent Mesh Swarm Test Suite...');

  // Event 1: Taylor Swift Scrobble
  console.log('\n--- Test Event 1: Music Scrobble Payout (USDC) ---');
  try {
    const res1 = await fetch(`${BASE_URL}/api/agents/swarm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'scrobble',
        sourceId: 'mbid-taylor-swift',
        creatorName: 'Taylor Swift',
        consumerAddress: '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
        metadata: {
          track: 'Cardigan',
          album: 'Folklore'
        }
      })
    });
    
    if (res1.ok) {
      const data = await res1.json();
      console.log('✅ Swarm Result:', data.success ? 'SUCCESS' : 'FAILED');
      console.log('Reasoning Logs:');
      data.logs.forEach((l: any) => console.log(`  [${l.agent}] - ${l.message}`));
      if (data.settlementDetails) {
        console.log('Settlement:', data.settlementDetails);
      }
    } else {
      console.log('❌ Request failed with status:', res1.status);
    }
  } catch (err: any) {
    console.error('❌ Error executing Test Event 1:', err.message);
  }

  // Event 2: Owncast Stream Webhook (EURC payout via StableFX)
  console.log('\n--- Test Event 2: Video Stream Viewer Check-in (EURC payout via StableFX) ---');
  try {
    const res2 = await fetch(`${BASE_URL}/api/agents/swarm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'stream_webhook',
        sourceId: 'owncast-stream-channel',
        creatorName: 'Owncast Streamer',
        consumerAddress: '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
        metadata: {
          durationSeconds: 120,
          payoutCurrency: 'EURC'
        }
      })
    });

    if (res2.ok) {
      const data = await res2.json();
      console.log('✅ Swarm Result:', data.success ? 'SUCCESS' : 'FAILED');
      console.log('Reasoning Logs:');
      data.logs.forEach((l: any) => console.log(`  [${l.agent}] - ${l.message}`));
      if (data.settlementDetails) {
        console.log('Settlement:', data.settlementDetails);
      }
    } else {
      console.log('❌ Request failed with status:', res2.status);
    }
  } catch (err: any) {
    console.error('❌ Error executing Test Event 2:', err.message);
  }
}

runTest().then(() => console.log('\n🏁 Swarm Test suite completed.'));
