import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfefkrzxkqbwnudchbwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZWZrcnp4a3Fid251ZGNoYndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTYzMzEsImV4cCI6MjA2ODkzMjMzMX0.pOu76z96868RL9BQEbf7ZSOV08RJVxTRRRLI1GxjXpI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  const { data, error } = await supabase
    .from('transcripts')
    .select('id, transcription, created_at, language')
    .limit(5);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Sample data:', data);
  }
}

testConnection();
