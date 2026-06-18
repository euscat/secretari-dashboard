const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Mapeig categories Secretari → categories Família Hub
const mapCategoria = (categoria) => {
  const mapa = {
    'familia': 'família',
    'personal': 'casa',
    'feina': 'gestions',
    'ai-projecte': 'gestions',
    'altres': 'casa'
  };
  return mapa[categoria] || 'casa';
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { id, text, categoria, assignat_a } = req.body;
    if (!id || !text) return res.status(400).json({ error: 'ID i text requerits' });

    // 1. Inserir a todos del Família Hub
    const { error: errorTodo } = await supabase
      .from('todos')
      .insert({
        text,
        cat: mapCategoria(categoria),
        urg: 'alta',
        done: false,
        assignee: assignat_a || null
      });

    if (errorTodo) return res.status(500).json({ error: errorTodo.message });

    // 2. Marcar entrada com a processada al Secretari
    const { error: errorUpdate } = await supabase
      .from('entrades_personals')
      .update({ processada: true })
      .eq('id', id);

    if (errorUpdate) return res.status(500).json({ error: errorUpdate.message });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Mètode no permès' });
};
