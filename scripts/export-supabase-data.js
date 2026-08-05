/**
 * Export all data from Supabase to a local JSON file.
 * Run with: node scripts/export-supabase-data.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxclpknuknpvhlonaapq.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_o1MyEFcnPoJmYS3ttpP8RA_HtT4FmMD';

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Fetching globes...');
  const { data: globes, error: gErr } = await supabase
    .from('globes')
    .select('*')
    .order('month_id', { ascending: false });

  if (gErr) {
    console.error('Error fetching globes:', gErr);
    process.exit(1);
  }
  console.log(`Found ${globes.length} globe(s).`);

  console.log('Fetching news items...');
  const { data: newsItems, error: nErr } = await supabase
    .from('news_items')
    .select('*')
    .order('updated_at', { ascending: true });

  if (nErr) {
    console.error('Error fetching news items:', nErr);
    process.exit(1);
  }
  console.log(`Found ${newsItems.length} news item(s).`);

  const exportData = { globes, newsItems, exportedAt: new Date().toISOString() };
  const outPath = path.join(__dirname, '..', 'supabase-export.json');
  fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2));
  console.log(`Data exported to ${outPath}`);
}

main().catch(console.error);
