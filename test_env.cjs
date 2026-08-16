const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient('https://esfqyvkcurklxjqfurih.supabase.co', 'sb_publishable_9pnIBMiHqiQcGtASmbMWCA_TUxw44gW');
  
  const {data: tokens} = await supabase.from('sessions').select('session_token, user_id').eq('user_id', 'USR_EVT_ADM_1000').order('created_at', {ascending: false}).limit(1);
  if(tokens && tokens.length > 0) {
      console.log('Token:', tokens[0].session_token);
      const rpcData = await supabase.rpc('ea_get_events', { p_token: tokens[0].session_token });
      console.log('RPC Error:', rpcData.error);
      console.log('RPC Data count:', rpcData.data ? rpcData.data.length : 0);
  } else {
      console.log('No token found');
  }
}
test();
