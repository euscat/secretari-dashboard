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

async function sendTelegram(chatId, msg) {
  if (!chatId) return;
  try {
    await fetch(`https://api.telegram.org/${process.env.TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
    });
  } catch (e) {
    console.log('Telegram error:', e);
  }
}

async function notifyAssignee(who, taskText) {
  if (who === 'leire' && process.env.TG_CHAT_LEIRE) {
    await sendTelegram(
      process.env.TG_CHAT_LEIRE,
      `📋 <b>Nova tasca assignada!</b>\n\nRoger t'ha assignat (via Secretari):\n<i>${taskText}</i>\n\n✅ Obre l'app per marcar-la com a feta`
    );
  }
  if (who === 'roger' && process.env.TG_CHAT_ROGER) {
    await sendTelegram(
      process.env.TG_CHAT_ROGER,
      `📋 <b>Nova tasca!</b> (via Secretari)\n\n<i>${taskText}</i>`
    );
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { id, text, categoria, assignat_a, tipus, regal_qui, regal_ocasio } = req.body;
    if (!id || !text) return res.status(400).json({ error: 'ID i text requerits' });

    if (tipus === 'regal') {
      // Inserir a la taula regals
      const { error: errorRegal } = await supabase
        .from('regals')
        .insert({
          name: text,
          who: regal_qui || null,
          ocasio: regal_ocasio || 'altres',
          price: 0,
          status: 'pendente'
        });

      if (errorRegal) return res.status(500).json({ error: errorRegal.message });

    } else {
      // Inserir a todos del Família Hub
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

      // Notificar via Telegram si està assignat a algú
      if (assignat_a === 'leire' || assignat_a === 'roger') {
        await notifyAssignee(assignat_a, text);
      }
    }

    // Marcar entrada com a processada al Secretari
    const { error: errorUpdate } = await supabase
      .from('entrades_personals')
      .update({ processada: true })
      .eq('id', id);

    if (errorUpdate) return res.status(500).json({ error: errorUpdate.message });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Mètode no permès' });
};
