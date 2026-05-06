-- ============================================================
-- SCRIPT SQL PARA SUPABASE - 3 TABLAS DE ANIME
-- 30 personajes en total (10 por anime), 4 imágenes cada uno
-- Pegar directamente en el SQL Editor de Supabase
-- ============================================================


-- ============================================================
-- TABLA 1: SAINT SEIYA
-- ============================================================

CREATE TABLE saint_seiya_personajes (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  edad        INTEGER,
  poder_tecnica TEXT,
  nacionalidad  VARCHAR(150),
  imagen1     TEXT,
  imagen2     TEXT,
  imagen3     TEXT,
  imagen4     TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO saint_seiya_personajes
  (nombre, edad, poder_tecnica, nacionalidad, imagen1, imagen2, imagen3, imagen4)
VALUES

-- 1. Pegasus Seiya
(
  'Pegasus Seiya', 13,
  'Meteoro de Pegaso (Ryusei Ken) – lluvia de puñetazos a velocidad de luz',
  'Japón',
  'https://static.wikia.nocookie.net/saint-seiya/images/4/44/Seiya_anime_infobox.png/revision/latest/scale-to-width-down/150?cb=20200101000000',
  'https://static.wikia.nocookie.net/saint-seiya/images/3/3a/Seiya_pegasus_cloth.png/revision/latest/scale-to-width-down/150?cb=20200101000001',
  'https://static.wikia.nocookie.net/saint-seiya/images/5/5f/Seiya_gold_cloth.jpg/revision/latest/scale-to-width-down/150?cb=20200101000002',
  'https://static.wikia.nocookie.net/saint-seiya/images/8/8e/Seiya_kid.png/revision/latest/scale-to-width-down/150?cb=20200101000003'
),

-- 2. Dragon Shiryu
(
  'Dragon Shiryu', 13,
  'Cataclismo del Dragón (Rozan Sho Ryu Ha) – dragón de energía devastador',
  'China',
  'https://static.wikia.nocookie.net/saint-seiya/images/1/1e/Shiryu_anime_infobox.png/revision/latest/scale-to-width-down/150?cb=20200101000004',
  'https://static.wikia.nocookie.net/saint-seiya/images/2/29/Dragon_shiryu_cloth.jpg/revision/latest/scale-to-width-down/150?cb=20200101000005',
  'https://static.wikia.nocookie.net/saint-seiya/images/6/60/Shiryu_libra_cloth.jpg/revision/latest/scale-to-width-down/150?cb=20200101000006',
  'https://static.wikia.nocookie.net/saint-seiya/images/0/0d/Shiryu_rising_dragon.jpg/revision/latest/scale-to-width-down/150?cb=20200101000007'
),

-- 3. Cisne Hyoga
(
  'Cisne Hyoga', 13,
  'Diamond Dust / Aurora Thunder Attack – control absoluto del frío y el hielo',
  'Rusia',
  'https://static.wikia.nocookie.net/saint-seiya/images/9/9e/Hyoga_anime_infobox.png/revision/latest/scale-to-width-down/150?cb=20200101000008',
  'https://static.wikia.nocookie.net/saint-seiya/images/b/b9/Hyoga_cygnus_cloth.jpg/revision/latest/scale-to-width-down/150?cb=20200101000009',
  'https://static.wikia.nocookie.net/saint-seiya/images/c/c4/Hyoga_aurora.jpg/revision/latest/scale-to-width-down/150?cb=20200101000010',
  'https://static.wikia.nocookie.net/saint-seiya/images/4/43/Hyoga_crystal.jpg/revision/latest/scale-to-width-down/150?cb=20200101000011'
),

-- 4. Andrómeda Shun
(
  'Andrómeda Shun', 13,
  'Cadenas Nebulosas de Andrómeda – cadenas de energía cósmica invencibles',
  'Japón',
  'https://static.wikia.nocookie.net/saint-seiya/images/7/7d/Shun_anime_infobox.png/revision/latest/scale-to-width-down/150?cb=20200101000012',
  'https://static.wikia.nocookie.net/saint-seiya/images/a/a6/Andromeda_shun_cloth.jpg/revision/latest/scale-to-width-down/150?cb=20200101000013',
  'https://static.wikia.nocookie.net/saint-seiya/images/3/35/Shun_nebula_chain.jpg/revision/latest/scale-to-width-down/150?cb=20200101000014',
  'https://static.wikia.nocookie.net/saint-seiya/images/e/e5/Shun_hades.jpg/revision/latest/scale-to-width-down/150?cb=20200101000015'
),

-- 5. Fénix Ikki
(
  'Fénix Ikki', 15,
  'Llama de la Fénix (Ho Yoku Ten Sho) – ataque psíquico e ilusiones mortales',
  'Japón',
  'https://static.wikia.nocookie.net/saint-seiya/images/f/f8/Ikki_anime_infobox.png/revision/latest/scale-to-width-down/150?cb=20200101000016',
  'https://static.wikia.nocookie.net/saint-seiya/images/5/5a/Phoenix_ikki_cloth.jpg/revision/latest/scale-to-width-down/150?cb=20200101000017',
  'https://static.wikia.nocookie.net/saint-seiya/images/d/d4/Ikki_phoenix.jpg/revision/latest/scale-to-width-down/150?cb=20200101000018',
  'https://static.wikia.nocookie.net/saint-seiya/images/8/8b/Ikki_fire.jpg/revision/latest/scale-to-width-down/150?cb=20200101000019'
),

-- 6. Sagitario Aiolos
(
  'Sagitario Aiolos', 26,
  'Flecha de Sagitario / Arrow of Athena – disparos de energía cósmica dorada',
  'Grecia',
  'https://static.wikia.nocookie.net/saint-seiya/images/c/c7/Aiolos_anime_infobox.png/revision/latest/scale-to-width-down/150?cb=20200101000020',
  'https://static.wikia.nocookie.net/saint-seiya/images/2/21/Sagittarius_aiolos_gold.jpg/revision/latest/scale-to-width-down/150?cb=20200101000021',
  'https://static.wikia.nocookie.net/saint-seiya/images/6/6e/Aiolos_golden_arrow.jpg/revision/latest/scale-to-width-down/150?cb=20200101000022',
  'https://static.wikia.nocookie.net/saint-seiya/images/9/90/Aiolos_young.jpg/revision/latest/scale-to-width-down/150?cb=20200101000023'
),

-- 7. Leo Aiolia
(
  'Leo Aiolia', 20,
  'Lightning Plasma / Photon Burst – tormenta de rayos a velocidad de la luz',
  'Grecia',
  'https://static.wikia.nocookie.net/saint-seiya/images/a/a8/Aiolia_anime_infobox.png/revision/latest/scale-to-width-down/150?cb=20200101000024',
  'https://static.wikia.nocookie.net/saint-seiya/images/4/4f/Leo_aiolia_gold_cloth.jpg/revision/latest/scale-to-width-down/150?cb=20200101000025',
  'https://static.wikia.nocookie.net/saint-seiya/images/3/3b/Aiolia_lightning.jpg/revision/latest/scale-to-width-down/150?cb=20200101000026',
  'https://static.wikia.nocookie.net/saint-seiya/images/7/74/Aiolia_seventh_sense.jpg/revision/latest/scale-to-width-down/150?cb=20200101000027'
),

-- 8. Geminis Saga
(
  'Geminis Saga', 28,
  'Otra Dimensión / Galaxian Explosion – manipulación dimensional y explosión galáctica',
  'Grecia',
  'https://static.wikia.nocookie.net/saint-seiya/images/e/e0/Saga_anime_infobox.png/revision/latest/scale-to-width-down/150?cb=20200101000028',
  'https://static.wikia.nocookie.net/saint-seiya/images/6/6d/Gemini_saga_gold_cloth.jpg/revision/latest/scale-to-width-down/150?cb=20200101000029',
  'https://static.wikia.nocookie.net/saint-seiya/images/b/bc/Saga_galaxian_explosion.jpg/revision/latest/scale-to-width-down/150?cb=20200101000030',
  'https://static.wikia.nocookie.net/saint-seiya/images/1/15/Saga_good_evil.jpg/revision/latest/scale-to-width-down/150?cb=20200101000031'
),

-- 9. Virgo Shaka
(
  'Virgo Shaka', 20,
  'Tenbu Hōrin / Rikudō Rinne – dominio total de los 6 sentidos y el cosmos divino',
  'India',
  'https://static.wikia.nocookie.net/saint-seiya/images/d/d6/Shaka_anime_infobox.png/revision/latest/scale-to-width-down/150?cb=20200101000032',
  'https://static.wikia.nocookie.net/saint-seiya/images/3/38/Virgo_shaka_gold_cloth.jpg/revision/latest/scale-to-width-down/150?cb=20200101000033',
  'https://static.wikia.nocookie.net/saint-seiya/images/5/51/Shaka_tenbu_horin.jpg/revision/latest/scale-to-width-down/150?cb=20200101000034',
  'https://static.wikia.nocookie.net/saint-seiya/images/8/87/Shaka_eyes.jpg/revision/latest/scale-to-width-down/150?cb=20200101000035'
),

-- 10. Capricornio Shura
(
  'Capricornio Shura', 24,
  'Excalibur – la espada de energía cósmica más poderosa, nacida de sus propios brazos',
  'Italia',
  'https://static.wikia.nocookie.net/saint-seiya/images/2/2c/Shura_anime_infobox.png/revision/latest/scale-to-width-down/150?cb=20200101000036',
  'https://static.wikia.nocookie.net/saint-seiya/images/4/48/Capricorn_shura_gold_cloth.jpg/revision/latest/scale-to-width-down/150?cb=20200101000037',
  'https://static.wikia.nocookie.net/saint-seiya/images/9/97/Shura_excalibur.jpg/revision/latest/scale-to-width-down/150?cb=20200101000038',
  'https://static.wikia.nocookie.net/saint-seiya/images/5/5e/Shura_fight.jpg/revision/latest/scale-to-width-down/150?cb=20200101000039'
);


-- ============================================================
-- TABLA 2: HUNTER X HUNTER
-- ============================================================

CREATE TABLE hunterxhunter_personajes (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  edad        INTEGER,
  poder_tecnica TEXT,
  nacionalidad  VARCHAR(150),
  imagen1     TEXT,
  imagen2     TEXT,
  imagen3     TEXT,
  imagen4     TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO hunterxhunter_personajes
  (nombre, edad, poder_tecnica, nacionalidad, imagen1, imagen2, imagen3, imagen4)
VALUES

-- 1. Gon Freecss
(
  'Gon Freecss', 12,
  'Jajanken (Nen Potenciador) – piedra, papel o tijeras cargados con aura; forma adulta con poder ilimitado',
  'Isla Ballena (ficticio)',
  'https://static.wikia.nocookie.net/hunterxhunter/images/a/a2/Gon_Freecss_2011.png/revision/latest/scale-to-width-down/150?cb=20131228071942',
  'https://static.wikia.nocookie.net/hunterxhunter/images/6/60/Gon_2011_adult.png/revision/latest/scale-to-width-down/150?cb=20141011015738',
  'https://static.wikia.nocookie.net/hunterxhunter/images/3/3e/Gon_kid_smile.png/revision/latest/scale-to-width-down/150?cb=20130101000001',
  'https://static.wikia.nocookie.net/hunterxhunter/images/c/c3/Gon_jajanken.png/revision/latest/scale-to-width-down/150?cb=20130101000002'
),

-- 2. Killua Zoldyck
(
  'Killua Zoldyck', 12,
  'Velocidad Divina (Godspeed) – Nen transmutador que convierte su aura en electricidad de altísima velocidad',
  'Montaña Kukuroo (ficticio)',
  'https://static.wikia.nocookie.net/hunterxhunter/images/d/d3/Killua_Zoldyck_2011.png/revision/latest/scale-to-width-down/150?cb=20131005195602',
  'https://static.wikia.nocookie.net/hunterxhunter/images/e/e8/Killua_godspeed.png/revision/latest/scale-to-width-down/150?cb=20130101000003',
  'https://static.wikia.nocookie.net/hunterxhunter/images/5/5c/Killua_alluka.png/revision/latest/scale-to-width-down/150?cb=20130101000004',
  'https://static.wikia.nocookie.net/hunterxhunter/images/1/1f/Killua_assassin_mode.png/revision/latest/scale-to-width-down/150?cb=20130101000005'
),

-- 3. Kurapika
(
  'Kurapika Kurta', 17,
  'Cadenas del Emperador (Nen Especialista) – 5 cadenas con habilidades únicas; una puede destruir cualquier Nen',
  'Clan Kurta (especie/tribu)',
  'https://static.wikia.nocookie.net/hunterxhunter/images/4/4f/Kurapika_2011.png/revision/latest/scale-to-width-down/150?cb=20131019180603',
  'https://static.wikia.nocookie.net/hunterxhunter/images/5/55/Kurapika_scarlet_eyes.png/revision/latest/scale-to-width-down/150?cb=20130101000006',
  'https://static.wikia.nocookie.net/hunterxhunter/images/7/7c/Kurapika_chains.png/revision/latest/scale-to-width-down/150?cb=20130101000007',
  'https://static.wikia.nocookie.net/hunterxhunter/images/2/2e/Kurapika_adult.png/revision/latest/scale-to-width-down/150?cb=20130101000008'
),

-- 4. Leorio Paradinight
(
  'Leorio Paradinight', 19,
  'Puño de Nen (Nen Especialista) – puñetazos proyectados a distancia a través del espacio',
  'República de Padokea (ficticio)',
  'https://static.wikia.nocookie.net/hunterxhunter/images/0/01/Leorio_2011.png/revision/latest/scale-to-width-down/150?cb=20131005231728',
  'https://static.wikia.nocookie.net/hunterxhunter/images/3/3b/Leorio_hunter.png/revision/latest/scale-to-width-down/150?cb=20130101000009',
  'https://static.wikia.nocookie.net/hunterxhunter/images/8/84/Leorio_adult.png/revision/latest/scale-to-width-down/150?cb=20130101000010',
  'https://static.wikia.nocookie.net/hunterxhunter/images/d/d5/Leorio_punch.png/revision/latest/scale-to-width-down/150?cb=20130101000011'
),

-- 5. Hisoka Morrow
(
  'Hisoka Morrow', 28,
  'Textura Elástica – Bungee Gum (Nen Transmutador): aura con propiedades de chicle y goma extremadamente pegajosa',
  'Desconocida',
  'https://static.wikia.nocookie.net/hunterxhunter/images/0/08/Hisoka_2011.png/revision/latest/scale-to-width-down/150?cb=20131005222700',
  'https://static.wikia.nocookie.net/hunterxhunter/images/5/5b/Hisoka_cards.png/revision/latest/scale-to-width-down/150?cb=20130101000012',
  'https://static.wikia.nocookie.net/hunterxhunter/images/9/9e/Hisoka_clown.png/revision/latest/scale-to-width-down/150?cb=20130101000013',
  'https://static.wikia.nocookie.net/hunterxhunter/images/f/f4/Hisoka_bungee_gum.png/revision/latest/scale-to-width-down/150?cb=20130101000014'
),

-- 6. Chrollo Lucilfer
(
  'Chrollo Lucilfer', 26,
  'Libro del Diablo (Nen Especialista) – roba y almacena las habilidades Nen de otros usuarios',
  'Ciudad Meteoro (ficticio)',
  'https://static.wikia.nocookie.net/hunterxhunter/images/e/e6/Chrollo_2011.png/revision/latest/scale-to-width-down/150?cb=20131005234128',
  'https://static.wikia.nocookie.net/hunterxhunter/images/4/4c/Chrollo_book.png/revision/latest/scale-to-width-down/150?cb=20130101000015',
  'https://static.wikia.nocookie.net/hunterxhunter/images/3/36/Chrollo_spider.png/revision/latest/scale-to-width-down/150?cb=20130101000016',
  'https://static.wikia.nocookie.net/hunterxhunter/images/7/7b/Chrollo_battle.png/revision/latest/scale-to-width-down/150?cb=20130101000017'
),

-- 7. Meruem
(
  'Meruem', 0,
  'Fortuna Relativa / Aura Condensada – absorbe el Nen de otros para aumentar su poder ilimitadamente',
  'Hormiga Quimera (especie)',
  'https://static.wikia.nocookie.net/hunterxhunter/images/e/e7/Meruem_2011.png/revision/latest/scale-to-width-down/150?cb=20140117230124',
  'https://static.wikia.nocookie.net/hunterxhunter/images/8/87/Meruem_king.png/revision/latest/scale-to-width-down/150?cb=20130101000018',
  'https://static.wikia.nocookie.net/hunterxhunter/images/5/5a/Meruem_komugi.png/revision/latest/scale-to-width-down/150?cb=20130101000019',
  'https://static.wikia.nocookie.net/hunterxhunter/images/c/c9/Meruem_final.png/revision/latest/scale-to-width-down/150?cb=20130101000020'
),

-- 8. Neferpitou
(
  'Neferpitou', 1,
  'Doctor Blythe (cura) / Terpsichora (control de cuerpos) – Nen Especialista felino con poder de Royal Guard',
  'Hormiga Quimera (especie)',
  'https://static.wikia.nocookie.net/hunterxhunter/images/3/3f/Neferpitou_2011.png/revision/latest/scale-to-width-down/150?cb=20131005235059',
  'https://static.wikia.nocookie.net/hunterxhunter/images/a/a8/Pitou_cat.png/revision/latest/scale-to-width-down/150?cb=20130101000021',
  'https://static.wikia.nocookie.net/hunterxhunter/images/1/10/Pitou_doctor.png/revision/latest/scale-to-width-down/150?cb=20130101000022',
  'https://static.wikia.nocookie.net/hunterxhunter/images/9/9f/Pitou_guard.png/revision/latest/scale-to-width-down/150?cb=20130101000023'
),

-- 9. Biscuit Krueger
(
  'Biscuit Krueger', 57,
  'Shingen-ryu Kung Fu + Nen (Transmutadora) – fuerza devastadora oculta en cuerpo de niña; maestra Nen',
  'Desconocida',
  'https://static.wikia.nocookie.net/hunterxhunter/images/3/3a/Biscuit_2011.png/revision/latest/scale-to-width-down/150?cb=20131005194038',
  'https://static.wikia.nocookie.net/hunterxhunter/images/5/5e/Biscuit_true_form.png/revision/latest/scale-to-width-down/150?cb=20130101000024',
  'https://static.wikia.nocookie.net/hunterxhunter/images/8/86/Biscuit_training.png/revision/latest/scale-to-width-down/150?cb=20130101000025',
  'https://static.wikia.nocookie.net/hunterxhunter/images/4/40/Biscuit_punch.png/revision/latest/scale-to-width-down/150?cb=20130101000026'
),

-- 10. Illumi Zoldyck
(
  'Illumi Zoldyck', 24,
  'Aguja Vudú – Manipulación de Nen (Nen Manipulador): controla personas con agujas ocultas en su cuerpo',
  'Montaña Kukuroo (ficticio)',
  'https://static.wikia.nocookie.net/hunterxhunter/images/9/9e/Illumi_2011.png/revision/latest/scale-to-width-down/150?cb=20131005223018',
  'https://static.wikia.nocookie.net/hunterxhunter/images/6/6d/Illumi_needle.png/revision/latest/scale-to-width-down/150?cb=20130101000027',
  'https://static.wikia.nocookie.net/hunterxhunter/images/3/32/Illumi_disguised.png/revision/latest/scale-to-width-down/150?cb=20130101000028',
  'https://static.wikia.nocookie.net/hunterxhunter/images/7/77/Illumi_smile.png/revision/latest/scale-to-width-down/150?cb=20130101000029'
);


-- ============================================================
-- TABLA 3: ONE PIECE
-- ============================================================

CREATE TABLE onepiece_personajes (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  edad        INTEGER,
  poder_tecnica TEXT,
  nacionalidad  VARCHAR(150),
  imagen1     TEXT,
  imagen2     TEXT,
  imagen3     TEXT,
  imagen4     TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO onepiece_personajes
  (nombre, edad, poder_tecnica, nacionalidad, imagen1, imagen2, imagen3, imagen4)
VALUES

-- 1. Monkey D. Luffy
(
  'Monkey D. Luffy', 19,
  'Fruta Gomu Gomu / Gear 5 (Nika) – cuerpo de goma + haki dominante; forma divina del Sol',
  'Brasil',
  'https://static.wikia.nocookie.net/onepiece/images/6/6d/Monkey_D._Luffy_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/150?cb=20220905201746',
  'https://static.wikia.nocookie.net/onepiece/images/5/5c/Luffy_Gear5.png/revision/latest/scale-to-width-down/150?cb=20230401000001',
  'https://static.wikia.nocookie.net/onepiece/images/7/7e/Luffy_Gear_Fourth.png/revision/latest/scale-to-width-down/150?cb=20200101000030',
  'https://static.wikia.nocookie.net/onepiece/images/3/3b/Luffy_young.png/revision/latest/scale-to-width-down/150?cb=20200101000031'
),

-- 2. Roronoa Zoro
(
  'Roronoa Zoro', 21,
  'Tres Espadas – Santoryu / Asura (Kyutoryu) – maestría de tres espadas y haki de armadura extremo',
  'Japón',
  'https://static.wikia.nocookie.net/onepiece/images/1/1d/Roronoa_Zoro_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/150?cb=20220908161656',
  'https://static.wikia.nocookie.net/onepiece/images/2/28/Zoro_Asura.png/revision/latest/scale-to-width-down/150?cb=20200101000032',
  'https://static.wikia.nocookie.net/onepiece/images/e/e2/Zoro_King_of_Hell.png/revision/latest/scale-to-width-down/150?cb=20230101000001',
  'https://static.wikia.nocookie.net/onepiece/images/9/96/Zoro_scar.jpg/revision/latest/scale-to-width-down/150?cb=20200101000033'
),

-- 3. Nami
(
  'Nami', 20,
  'Clima-Tact / Perfect Clima-Tact – control del clima, relámpagos y temperatura extrema',
  'Suecia',
  'https://static.wikia.nocookie.net/onepiece/images/c/c3/Nami_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/150?cb=20220909020840',
  'https://static.wikia.nocookie.net/onepiece/images/4/41/Nami_clima_tact.png/revision/latest/scale-to-width-down/150?cb=20200101000034',
  'https://static.wikia.nocookie.net/onepiece/images/7/79/Nami_navigator.jpg/revision/latest/scale-to-width-down/150?cb=20200101000035',
  'https://static.wikia.nocookie.net/onepiece/images/b/b5/Nami_wano.png/revision/latest/scale-to-width-down/150?cb=20200101000036'
),

-- 4. Usopp
(
  'Usopp', 19,
  'Francotirador / Pop Greens (Kabuto) – precisión legendaria y explosivos de semillas botánicas',
  'África',
  'https://static.wikia.nocookie.net/onepiece/images/c/c8/Usopp_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/150?cb=20220909022616',
  'https://static.wikia.nocookie.net/onepiece/images/3/3e/Usopp_sogeking.png/revision/latest/scale-to-width-down/150?cb=20200101000037',
  'https://static.wikia.nocookie.net/onepiece/images/5/52/Usopp_kabuto.png/revision/latest/scale-to-width-down/150?cb=20200101000038',
  'https://static.wikia.nocookie.net/onepiece/images/8/8c/Usopp_god.png/revision/latest/scale-to-width-down/150?cb=20200101000039'
),

-- 5. Sanji
(
  'Sanji', 21,
  'Pata Negra (Black Leg) / Ifrit Jambe – patadas de fuego infernal y exoesqueleto de combate Raid Suit',
  'Francia',
  'https://static.wikia.nocookie.net/onepiece/images/b/be/Sanji_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/150?cb=20220909021736',
  'https://static.wikia.nocookie.net/onepiece/images/2/28/Sanji_ifrit_jambe.png/revision/latest/scale-to-width-down/150?cb=20230101000002',
  'https://static.wikia.nocookie.net/onepiece/images/9/9a/Sanji_raid_suit.png/revision/latest/scale-to-width-down/150?cb=20200101000040',
  'https://static.wikia.nocookie.net/onepiece/images/6/6f/Sanji_cool.jpg/revision/latest/scale-to-width-down/150?cb=20200101000041'
),

-- 6. Portgas D. Ace
(
  'Portgas D. Ace', 20,
  'Fruta Mera Mera no Mi (Fuego) – control y transformación total en llamas',
  'Australia',
  'https://static.wikia.nocookie.net/onepiece/images/0/02/Portgas_D._Ace_Anime_Infobox.png/revision/latest/scale-to-width-down/150?cb=20220331181524',
  'https://static.wikia.nocookie.net/onepiece/images/4/4d/Ace_fire_fist.png/revision/latest/scale-to-width-down/150?cb=20200101000042',
  'https://static.wikia.nocookie.net/onepiece/images/1/14/Ace_whitebeard.jpg/revision/latest/scale-to-width-down/150?cb=20200101000043',
  'https://static.wikia.nocookie.net/onepiece/images/a/ab/Ace_young.png/revision/latest/scale-to-width-down/150?cb=20200101000044'
),

-- 7. Nico Robin
(
  'Nico Robin', 30,
  'Fruta Hana Hana no Mi (Floreo) – replica partes de su cuerpo en cualquier superficie; Gigante de Flores',
  'Rusia',
  'https://static.wikia.nocookie.net/onepiece/images/5/5c/Nico_Robin_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/150?cb=20220909021245',
  'https://static.wikia.nocookie.net/onepiece/images/9/9f/Robin_giant.png/revision/latest/scale-to-width-down/150?cb=20200101000045',
  'https://static.wikia.nocookie.net/onepiece/images/3/37/Robin_hana_hana.png/revision/latest/scale-to-width-down/150?cb=20200101000046',
  'https://static.wikia.nocookie.net/onepiece/images/c/cf/Robin_wano.png/revision/latest/scale-to-width-down/150?cb=20200101000047'
),

-- 8. Trafalgar D. Water Law
(
  'Trafalgar D. Water Law', 26,
  'Fruta Ope Ope no Mi – Sala de Operaciones: manipulación total de todo lo que está dentro de su esfera',
  'Alemania',
  'https://static.wikia.nocookie.net/onepiece/images/b/b2/Trafalgar_D._Water_Law_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/150?cb=20220909022053',
  'https://static.wikia.nocookie.net/onepiece/images/4/4c/Law_room.png/revision/latest/scale-to-width-down/150?cb=20200101000048',
  'https://static.wikia.nocookie.net/onepiece/images/3/3d/Law_shambles.png/revision/latest/scale-to-width-down/150?cb=20200101000049',
  'https://static.wikia.nocookie.net/onepiece/images/8/8d/Law_wano.png/revision/latest/scale-to-width-down/150?cb=20200101000050'
),

-- 9. Shanks (Red Hair)
(
  'Shanks (Cabello Rojo)', 39,
  'Haki del Rey (Conqueror''s Haki) y maestría de espada – sin fruta del diablo, pero el más temido del mundo',
  'Irlanda',
  'https://static.wikia.nocookie.net/onepiece/images/f/f2/Shanks_Anime_Infobox.png/revision/latest/scale-to-width-down/150?cb=20220909022313',
  'https://static.wikia.nocookie.net/onepiece/images/8/84/Shanks_haoshoku.png/revision/latest/scale-to-width-down/150?cb=20200101000051',
  'https://static.wikia.nocookie.net/onepiece/images/2/2e/Shanks_young.png/revision/latest/scale-to-width-down/150?cb=20200101000052',
  'https://static.wikia.nocookie.net/onepiece/images/5/5b/Shanks_marineford.jpg/revision/latest/scale-to-width-down/150?cb=20200101000053'
),

-- 10. Dracule Mihawk
(
  'Dracule Mihawk', 41,
  'Espadachín Supremo del Mundo – Yoru (la espada negra más grande) + dominio total de haki de armadura',
  'España',
  'https://static.wikia.nocookie.net/onepiece/images/7/76/Dracule_Mihawk_Anime_Infobox.png/revision/latest/scale-to-width-down/150?cb=20220909015839',
  'https://static.wikia.nocookie.net/onepiece/images/3/35/Mihawk_yoru.png/revision/latest/scale-to-width-down/150?cb=20200101000054',
  'https://static.wikia.nocookie.net/onepiece/images/9/9b/Mihawk_cross.jpg/revision/latest/scale-to-width-down/150?cb=20200101000055',
  'https://static.wikia.nocookie.net/onepiece/images/e/e6/Mihawk_cloack.png/revision/latest/scale-to-width-down/150?cb=20200101000056'
);


-- ============================================================
-- VERIFICACIÓN RÁPIDA (opcional, ejecutar después del INSERT)
-- ============================================================

-- SELECT * FROM saint_seiya_personajes;
-- SELECT * FROM hunterxhunter_personajes;
-- SELECT * FROM onepiece_personajes;
