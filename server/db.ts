import { Pool } from 'pg';

// Configure SSL for database connection
// In production, prefer proper SSL validation. rejectUnauthorized: false is used
// as a fallback for managed databases with self-signed certs (Railway, Heroku, etc.)
const getSslConfig = () => {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  // If a CA certificate is provided, use it for proper validation
  if (process.env.DATABASE_CA_CERT) {
    return {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_CA_CERT,
    };
  }

  // Fallback for managed databases with self-signed certs
  // Note: This disables certificate validation - only use with trusted providers
  return { rejectUnauthorized: false };
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSslConfig(),
});

// Initialize database tables
export const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        native_language TEXT,
        learning_language TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS texts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vocabulary (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        word TEXT NOT NULL,
        translation TEXT NOT NULL,
        context TEXT,
        language TEXT NOT NULL,
        next_review TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        interval INTEGER DEFAULT 0,
        ease_factor REAL DEFAULT 2.5,
        review_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
        quality INTEGER NOT NULL,
        reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_vocabulary_user_id ON vocabulary(user_id);
      CREATE INDEX IF NOT EXISTS idx_vocabulary_next_review ON vocabulary(next_review);
      CREATE INDEX IF NOT EXISTS idx_texts_user_id ON texts(user_id);
    `);

    // Add email verification columns if they don't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verified') THEN
          ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verification_token') THEN
          ALTER TABLE users ADD COLUMN verification_token TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verification_token_expires') THEN
          ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='target_language') THEN
          ALTER TABLE users ADD COLUMN target_language TEXT DEFAULT 'English';
        END IF;
      END $$;
    `);

    // Add mnemonic column to vocabulary table for Link and Story Method
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vocabulary' AND column_name='mnemonic') THEN
          ALTER TABLE vocabulary ADD COLUMN mnemonic TEXT;
        END IF;
      END $$;
    `);

    // Create sustainability tracking tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_costs (
        id SERIAL PRIMARY KEY,
        month DATE NOT NULL,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cost_usd DECIMAL(10, 6) DEFAULT 0,
        request_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(month)
      );

      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        kofi_transaction_id TEXT UNIQUE,
        amount DECIMAL(10, 2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        donation_type TEXT DEFAULT 'Donation',
        month DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_api_costs_month ON api_costs(month);
      CREATE INDEX IF NOT EXISTS idx_donations_month ON donations(month);
    `);

    // Migrate donations table from Stripe to Ko-fi if needed
    await client.query(`
      DO $$
      BEGIN
        -- Add kofi_transaction_id if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='kofi_transaction_id') THEN
          ALTER TABLE donations ADD COLUMN kofi_transaction_id TEXT UNIQUE;
        END IF;
        -- Add currency if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='currency') THEN
          ALTER TABLE donations ADD COLUMN currency TEXT DEFAULT 'USD';
        END IF;
        -- Add donation_type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='donation_type') THEN
          ALTER TABLE donations ADD COLUMN donation_type TEXT DEFAULT 'Donation';
        END IF;
        -- Rename amount_usd to amount if needed
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='amount_usd') THEN
          ALTER TABLE donations RENAME COLUMN amount_usd TO amount;
        END IF;
      END $$;
    `);

    // Add soft delete column to texts table
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='texts' AND column_name='deleted_at') THEN
          ALTER TABLE texts ADD COLUMN deleted_at TIMESTAMP;
        END IF;
      END $$;
    `);

    // Create default anonymous user for no-login access
    await client.query(`
      INSERT INTO users (id, email, password, name, verified, target_language)
      VALUES (1, 'anonymous@langstall.local', '', 'Anonymous', TRUE, 'English')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Add template texts for anonymous user if none exist
    const existingTexts = await client.query(
      'SELECT COUNT(*) FROM texts WHERE user_id = 1 AND deleted_at IS NULL'
    );

    if (parseInt(existingTexts.rows[0].count) === 0) {
      const templateTexts = [
        {
          title: 'El pequeño príncipe (Extracto)',
          content: `Cuando yo tenía seis años vi en un libro sobre la selva virgen que se titulaba "Historias vividas", una magnífica lámina. Representaba una serpiente boa que se tragaba a una fiera.

En el libro se afirmaba: "La serpiente boa se traga su presa entera, sin masticarla. Luego ya no puede moverse y duerme durante los seis meses que dura su digestión".

Reflexioné mucho en ese momento sobre las aventuras de la jungla y a mi vez logré trazar con un lápiz de colores mi primer dibujo.

Enseñé mi obra de arte a las personas mayores y les pregunté si mi dibujo les daba miedo. Me respondieron: "¿Por qué habría de asustar un sombrero?"

Mi dibujo no representaba un sombrero. Representaba una serpiente boa que digiere un elefante.`,
          language: 'Spanish'
        },
        {
          title: 'Le Petit Prince (Extrait)',
          content: `Lorsque j'avais six ans j'ai vu, une fois, une magnifique image, dans un livre sur la Forêt Vierge qui s'appelait "Histoires Vécues". Ça représentait un serpent boa qui avalait un fauve.

On disait dans le livre: "Les serpents boas avalent leur proie tout entière, sans la mâcher. Ensuite ils ne peuvent plus bouger et ils dorment pendant les six mois de leur digestion."

J'ai alors beaucoup réfléchi sur les aventures de la jungle et, à mon tour, j'ai réussi, avec un crayon de couleur, à tracer mon premier dessin.

J'ai montré mon chef-d'œuvre aux grandes personnes et je leur ai demandé si mon dessin leur faisait peur. Elles m'ont répondu: "Pourquoi un chapeau ferait-il peur?"

Mon dessin ne représentait pas un chapeau. Il représentait un serpent boa qui digérait un éléphant.`,
          language: 'French'
        },
        {
          title: 'Der kleine Prinz (Auszug)',
          content: `Als ich sechs Jahre alt war, sah ich einmal in einem Buch über den Urwald, das "Erlebte Geschichten" hieß, ein prächtiges Bild. Es stellte eine Riesenschlange dar, wie sie ein Wildtier verschlang.

In dem Buch hieß es: "Die Riesenschlangen verschlingen ihre Beute als Ganzes, ohne sie zu zerkauen. Danach können sie sich nicht mehr rühren und schlafen sechs Monate, um zu verdauen."

Ich habe damals viel über die Abenteuer des Dschungels nachgedacht und entwarf mit einem Farbstift meine erste Zeichnung.

Ich habe den großen Leuten mein Meisterwerk gezeigt und sie gefragt, ob ihnen meine Zeichnung Angst mache. Sie antworteten mir: "Warum sollte ein Hut Angst machen?"

Meine Zeichnung stellte aber keinen Hut dar. Sie stellte eine Riesenschlange dar, die einen Elefanten verdaute.`,
          language: 'German'
        },
        {
          title: '星の王子さま（抜粋）',
          content: `ぼくが六つのとき、「ほんとうにあった話」という、原始林についての本で、すばらしい絵を見た。それは、大蛇のボアが猛獣を飲みこんでいる絵だった。

本にはこう書いてあった。「ボアは獲物をかまずに丸のみにする。それから動けなくなって、消化する六か月間、眠り続ける」

ぼくはジャングルの冒険についていろいろ考えた。そして色鉛筆で、ぼくの最初の絵を描いた。

ぼくは傑作を大人たちに見せて、怖いかどうか聞いてみた。大人たちは答えた。「帽子がどうして怖いの？」

ぼくの絵は帽子じゃなかった。象を消化している大蛇のボアの絵だった。`,
          language: 'Japanese'
        },
        {
          title: 'Il Piccolo Principe (Estratto)',
          content: `Quando avevo sei anni vidi, una volta, in un libro sulla Foresta Vergine che si intitolava "Storie vissute", una magnifica figura. Rappresentava un serpente boa che inghiottiva una belva.

Nel libro c'era scritto: "I serpenti boa inghiottono la loro preda tutta intera, senza masticarla. Dopodiché non riescono più a muoversi e dormono i sei mesi della digestione".

Allora ho riflettuto molto sulle avventure della giungla e, a mia volta, sono riuscito, con una matita colorata, a tracciare il mio primo disegno.

Ho mostrato il mio capolavoro alle persone grandi e ho domandato se il mio disegno faceva loro paura. Mi hanno risposto: "Perché un cappello dovrebbe fare paura?"

Il mio disegno non rappresentava un cappello. Rappresentava un serpente boa che digeriva un elefante.`,
          language: 'Italian'
        },
        {
          title: 'O Pequeno Príncipe (Trecho)',
          content: `Quando eu tinha seis anos, vi uma vez uma imagem magnífica num livro sobre a Floresta Virgem chamado "Histórias Vividas". Representava uma jiboia engolindo uma fera.

Dizia-se no livro: "As jiboias engolem as suas presas inteiras, sem mastigar. Depois não conseguem mexer-se e dormem os seis meses da digestão".

Refleti muito então sobre as aventuras da selva e, por minha vez, consegui traçar com lápis de cor o meu primeiro desenho.

Mostrei a minha obra-prima às pessoas grandes e perguntei se o meu desenho lhes fazia medo. Responderam-me: "Por que é que um chapéu faria medo?"

O meu desenho não representava um chapéu. Representava uma jiboia a digerir um elefante.`,
          language: 'Portuguese'
        },
        {
          title: '어린 왕자 (발췌)',
          content: `여섯 살 때 나는 "실제로 있었던 이야기"라는 원시림에 관한 책에서 멋진 그림을 보았다. 그것은 맹수를 삼키고 있는 보아뱀의 그림이었다.

책에는 이렇게 쓰여 있었다. "보아뱀은 먹이를 씹지 않고 통째로 삼킨다. 그런 다음 움직이지 못하고 소화하는 여섯 달 동안 잠을 잔다."

나는 정글의 모험에 대해 많이 생각했다. 그리고 색연필로 나의 첫 번째 그림을 그렸다.

나는 어른들에게 내 걸작을 보여주며 무섭냐고 물었다. 어른들은 대답했다. "모자가 뭐가 무섭다는 거야?"

내 그림은 모자가 아니었다. 코끼리를 소화하고 있는 보아뱀 그림이었다.`,
          language: 'Korean'
        },
        {
          title: 'Маленький принц (отрывок)',
          content: `Когда мне было шесть лет, в книге под названием «Правдивые истории» я увидел однажды удивительную картинку. На ней был нарисован удав, который глотает хищного зверя.

В книге говорилось: «Удав заглатывает свою жертву целиком, не разжёвывая. После этого он уже не может шевельнуться и спит полгода подряд, пока не переварит пищу».

Я много размышлял о приключениях в джунглях и нарисовал цветным карандашом свою первую картинку.

Я показал свой шедевр взрослым и спросил, не страшно ли им. Взрослые ответили: «Разве шляпа страшная?»

Это была не шляпа. Это был удав, который проглотил слона.`,
          language: 'Russian'
        },
        {
          title: '小王子（节选）',
          content: `我六岁的时候，在一本描写原始森林的书中，看到了一幅精彩的插画。那是一条蟒蛇正在吞食一只野兽。

书上写道："蟒蛇把猎物整个吞下去，一点也不咀嚼。然后它就动不了了，要睡上六个月来消化食物。"

那时候，我对丛林中的奇遇想了很多，于是，我用彩色铅笔画出了我的第一幅图画。

我把我的杰作拿给大人们看，问他们我的画是不是让他们害怕。他们回答说："一顶帽子有什么可怕的？"

我画的不是帽子。我画的是一条正在消化大象的蟒蛇。`,
          language: 'Chinese'
        },
        {
          title: 'Küçük Prens (Alıntı)',
          content: `Altı yaşındayken, "Yaşanmış Öyküler" adlı bir kitapta, ilk ormanlar hakkında harika bir resim gördüm. Bir yırtıcı hayvanı yutan bir boa yılanını gösteriyordu.

Kitapta şöyle yazıyordu: "Boa yılanları avlarını çiğnemeden bütün olarak yutarlar. Sonra hareket edemezler ve sindirim süresince altı ay uyurlar."

O zaman orman maceraları hakkında çok düşündüm ve renkli kalemimle ilk resmimi çizdim.

Başyapıtımı büyüklere gösterdim ve resmimin onları korkutup korkutmadığını sordum. Bana cevap verdiler: "Bir şapka neden korkutsun ki?"

Resmim bir şapka değildi. Bir fili sindiren boa yılanıydı.`,
          language: 'Turkish'
        }
      ];

      for (const text of templateTexts) {
        await client.query(
          'INSERT INTO texts (user_id, title, content, language) VALUES (1, $1, $2, $3)',
          [text.title, text.content, text.language]
        );
      }
      console.log('Template texts created for anonymous user');
    }

    console.log('Database initialized');
  } finally {
    client.release();
  }
};

export default pool;
