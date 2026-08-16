const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function test() {
  const code = fs.readFileSync('src/supabaseClient.js', 'utf8');
  let url = '';
  let key = '';
  const lines = code.split('\n');
  for(let line of lines) {
    if(line.includes('supabaseUrl =')) url = line.split('=')[1].replace(/['";]/g, '').trim();
    if(line.includes('supabaseAnonKey =')) key = line.split('=')[1].replace(/['";]/g, '').trim();
  }
  
  if(!url || !key) {
    console.log('No credentials');
    return;
  }
  const supabase = createClient(url, key);
  
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
