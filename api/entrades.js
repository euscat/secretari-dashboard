const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — llegir entrades
  if (req.method === 'GET') {
    const { filtre = 'inbox', limit = 50 } = req.query;

    let query = supabase
      .from('entrades_personals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filtre === 'inbox') query = query.eq('processada', false);
    if (filtre === 'arxiu') query = query.eq('processada', true);
    // 'tot' no filtra

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // PATCH — actualitzar entrada
  if (req.method === 'PATCH') {
    const { id, ...camps } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requerit' });

    const { data, error } = await supabase
      .from('entrades_personals')
      .update(camps)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // DELETE — eliminar entrada
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID requerit' });

    const { error } = await supabase
      .from('entrades_personals')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Mètode no permès' });
};
