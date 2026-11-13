-- Conteúdo base da plataforma (gerado por scripts/gen_seed.py)
-- Identificado como conteúdo base (teacher_id nulo). Não são dados de alunos.

insert into public.vocab_words (teacher_id, category, word, translation, pronunciation, example, example_translation, level) values
(null, 'Cotidiano', 'wake up', 'acordar', '/weɪk ʌp/', 'I wake up at 7 a.m.', 'Eu acordo às 7 da manhã.', 'beginner'),
(null, 'Cotidiano', 'breakfast', 'café da manhã', '/ˈbrekfəst/', 'I have breakfast with my family.', 'Eu tomo café da manhã com minha família.', 'beginner'),
(null, 'Cotidiano', 'work', 'trabalhar / trabalho', '/wɜːrk/', 'She works in a hospital.', 'Ela trabalha em um hospital.', 'beginner'),
(null, 'Cotidiano', 'shower', 'banho (de chuveiro)', '/ˈʃaʊər/', 'I take a shower every morning.', 'Eu tomo banho toda manhã.', 'beginner'),
(null, 'Cotidiano', 'bed', 'cama', '/bed/', 'I go to bed at 10 p.m.', 'Eu vou para a cama às 22h.', 'beginner'),
(null, 'Cotidiano', 'weekend', 'fim de semana', '/ˈwiːkend/', 'What do you do on the weekend?', 'O que você faz no fim de semana?', 'beginner'),
(null, 'Cotidiano', 'busy', 'ocupado', '/ˈbɪzi/', 'I am very busy today.', 'Estou muito ocupado hoje.', 'beginner'),
(null, 'Cotidiano', 'tired', 'cansado', '/ˈtaɪərd/', 'She is tired after work.', 'Ela está cansada depois do trabalho.', 'beginner'),
(null, 'Alimentos', 'bread', 'pão', '/bred/', 'I eat bread with butter.', 'Eu como pão com manteiga.', 'beginner'),
(null, 'Alimentos', 'cheese', 'queijo', '/tʃiːz/', 'Do you like cheese?', 'Você gosta de queijo?', 'beginner'),
(null, 'Alimentos', 'chicken', 'frango', '/ˈtʃɪkɪn/', 'We are having chicken for dinner.', 'Vamos comer frango no jantar.', 'beginner'),
(null, 'Alimentos', 'rice', 'arroz', '/raɪs/', 'Rice and beans are popular in Brazil.', 'Arroz e feijão são populares no Brasil.', 'beginner'),
(null, 'Alimentos', 'apple', 'maçã', '/ˈæpəl/', 'An apple a day keeps the doctor away.', 'Uma maçã por dia mantém o médico longe.', 'beginner'),
(null, 'Alimentos', 'juice', 'suco', '/dʒuːs/', 'I''d like an orange juice, please.', 'Eu gostaria de um suco de laranja, por favor.', 'beginner'),
(null, 'Alimentos', 'vegetables', 'legumes / verduras', '/ˈvedʒtəbəlz/', 'Vegetables are good for you.', 'Legumes fazem bem para você.', 'beginner'),
(null, 'Alimentos', 'dessert', 'sobremesa', '/dɪˈzɜːrt/', 'What''s for dessert?', 'O que tem de sobremesa?', 'beginner'),
(null, 'Profissões', 'teacher', 'professor(a)', '/ˈtiːtʃər/', 'My teacher is very patient.', 'Minha professora é muito paciente.', 'beginner'),
(null, 'Profissões', 'doctor', 'médico(a)', '/ˈdɑːktər/', 'The doctor is in the office.', 'O médico está no consultório.', 'beginner'),
(null, 'Profissões', 'nurse', 'enfermeiro(a)', '/nɜːrs/', 'The nurse helps the patients.', 'A enfermeira ajuda os pacientes.', 'beginner'),
(null, 'Profissões', 'lawyer', 'advogado(a)', '/ˈlɔːjər/', 'She wants to be a lawyer.', 'Ela quer ser advogada.', 'beginner'),
(null, 'Profissões', 'engineer', 'engenheiro(a)', '/ˌendʒɪˈnɪr/', 'He is a software engineer.', 'Ele é engenheiro de software.', 'beginner'),
(null, 'Profissões', 'cook', 'cozinheiro(a)', '/kʊk/', 'The cook makes delicious food.', 'O cozinheiro faz comida deliciosa.', 'beginner'),
(null, 'Profissões', 'salesperson', 'vendedor(a)', '/ˈseɪlzpɜːrsən/', 'The salesperson was very helpful.', 'O vendedor foi muito prestativo.', 'beginner'),
(null, 'Profissões', 'driver', 'motorista', '/ˈdraɪvər/', 'The bus driver is friendly.', 'O motorista do ônibus é simpático.', 'beginner'),
(null, 'Família', 'mother', 'mãe', '/ˈmʌðər/', 'My mother is a teacher.', 'Minha mãe é professora.', 'beginner'),
(null, 'Família', 'father', 'pai', '/ˈfɑːðər/', 'My father likes football.', 'Meu pai gosta de futebol.', 'beginner'),
(null, 'Família', 'brother', 'irmão', '/ˈbrʌðər/', 'I have one brother.', 'Eu tenho um irmão.', 'beginner'),
(null, 'Família', 'sister', 'irmã', '/ˈsɪstər/', 'My sister is older than me.', 'Minha irmã é mais velha que eu.', 'beginner'),
(null, 'Família', 'grandparents', 'avós', '/ˈɡrænperənts/', 'I visit my grandparents on Sundays.', 'Eu visito meus avós aos domingos.', 'beginner'),
(null, 'Família', 'cousin', 'primo(a)', '/ˈkʌzən/', 'My cousin lives in Canada.', 'Meu primo mora no Canadá.', 'beginner'),
(null, 'Família', 'aunt', 'tia', '/ænt/', 'My aunt makes great cakes.', 'Minha tia faz bolos ótimos.', 'beginner'),
(null, 'Família', 'uncle', 'tio', '/ˈʌŋkəl/', 'My uncle is a driver.', 'Meu tio é motorista.', 'beginner'),
(null, 'Escola', 'classroom', 'sala de aula', '/ˈklæsruːm/', 'The classroom is on the second floor.', 'A sala de aula fica no segundo andar.', 'beginner'),
(null, 'Escola', 'homework', 'lição de casa', '/ˈhoʊmwɜːrk/', 'Did you do your homework?', 'Você fez sua lição de casa?', 'beginner'),
(null, 'Escola', 'notebook', 'caderno', '/ˈnoʊtbʊk/', 'Write it in your notebook.', 'Escreva no seu caderno.', 'beginner'),
(null, 'Escola', 'test', 'prova', '/test/', 'We have a test on Friday.', 'Temos prova na sexta-feira.', 'beginner'),
(null, 'Escola', 'subject', 'matéria', '/ˈsʌbdʒɪkt/', 'My favorite subject is English.', 'Minha matéria favorita é inglês.', 'beginner'),
(null, 'Escola', 'break', 'intervalo', '/breɪk/', 'We play during the break.', 'Nós brincamos no intervalo.', 'beginner'),
(null, 'Escola', 'grade', 'nota / série', '/ɡreɪd/', 'I got a good grade.', 'Eu tirei uma boa nota.', 'beginner'),
(null, 'Escola', 'principal', 'diretor(a)', '/ˈprɪnsəpəl/', 'The principal is in a meeting.', 'A diretora está em reunião.', 'beginner'),
(null, 'Viagens', 'airport', 'aeroporto', '/ˈerpɔːrt/', 'We arrived at the airport early.', 'Chegamos cedo ao aeroporto.', 'beginner'),
(null, 'Viagens', 'passport', 'passaporte', '/ˈpæspɔːrt/', 'Don''t forget your passport.', 'Não esqueça seu passaporte.', 'beginner'),
(null, 'Viagens', 'ticket', 'passagem / ingresso', '/ˈtɪkɪt/', 'I bought a round-trip ticket.', 'Comprei uma passagem de ida e volta.', 'beginner'),
(null, 'Viagens', 'luggage', 'bagagem', '/ˈlʌɡɪdʒ/', 'My luggage is too heavy.', 'Minha bagagem está pesada demais.', 'beginner'),
(null, 'Viagens', 'hotel', 'hotel', '/hoʊˈtel/', 'We stayed at a small hotel.', 'Ficamos em um hotel pequeno.', 'beginner'),
(null, 'Viagens', 'reservation', 'reserva', '/ˌrezərˈveɪʃən/', 'I have a reservation for two nights.', 'Tenho uma reserva para duas noites.', 'beginner'),
(null, 'Viagens', 'trip', 'viagem', '/trɪp/', 'How was your trip?', 'Como foi sua viagem?', 'beginner'),
(null, 'Viagens', 'map', 'mapa', '/mæp/', 'Can you show me on the map?', 'Você pode me mostrar no mapa?', 'beginner'),
(null, 'Animais', 'dog', 'cachorro', '/dɔːɡ/', 'My dog loves to run.', 'Meu cachorro adora correr.', 'beginner'),
(null, 'Animais', 'cat', 'gato', '/kæt/', 'The cat is sleeping.', 'O gato está dormindo.', 'beginner'),
(null, 'Animais', 'bird', 'pássaro', '/bɜːrd/', 'A bird is singing outside.', 'Um pássaro está cantando lá fora.', 'beginner'),
(null, 'Animais', 'horse', 'cavalo', '/hɔːrs/', 'She can ride a horse.', 'Ela sabe andar a cavalo.', 'beginner'),
(null, 'Animais', 'fish', 'peixe', '/fɪʃ/', 'Fish live in water.', 'Peixes vivem na água.', 'beginner'),
(null, 'Animais', 'cow', 'vaca', '/kaʊ/', 'Cows give us milk.', 'Vacas nos dão leite.', 'beginner'),
(null, 'Animais', 'monkey', 'macaco', '/ˈmʌŋki/', 'Monkeys are very smart.', 'Macacos são muito espertos.', 'beginner'),
(null, 'Animais', 'turtle', 'tartaruga', '/ˈtɜːrtəl/', 'The turtle is slow.', 'A tartaruga é lenta.', 'beginner'),
(null, 'Tecnologia', 'computer', 'computador', '/kəmˈpjuːtər/', 'I use my computer to study.', 'Uso meu computador para estudar.', 'beginner'),
(null, 'Tecnologia', 'smartphone', 'celular', '/ˈsmɑːrtfoʊn/', 'My smartphone is out of battery.', 'Meu celular está sem bateria.', 'beginner'),
(null, 'Tecnologia', 'password', 'senha', '/ˈpæswɜːrd/', 'Never share your password.', 'Nunca compartilhe sua senha.', 'beginner'),
(null, 'Tecnologia', 'download', 'baixar', '/ˈdaʊnloʊd/', 'Download the app for free.', 'Baixe o aplicativo de graça.', 'beginner'),
(null, 'Tecnologia', 'screen', 'tela', '/skriːn/', 'The screen is too bright.', 'A tela está muito clara.', 'beginner'),
(null, 'Tecnologia', 'keyboard', 'teclado', '/ˈkiːbɔːrd/', 'The keyboard isn''t working.', 'O teclado não está funcionando.', 'beginner'),
(null, 'Tecnologia', 'website', 'site', '/ˈwebsaɪt/', 'Visit our website.', 'Visite nosso site.', 'beginner'),
(null, 'Tecnologia', 'charger', 'carregador', '/ˈtʃɑːrdʒər/', 'Can I borrow your charger?', 'Posso pegar seu carregador emprestado?', 'beginner'),
(null, 'Lugares', 'bank', 'banco', '/bæŋk/', 'The bank opens at 10.', 'O banco abre às 10.', 'beginner'),
(null, 'Lugares', 'library', 'biblioteca', '/ˈlaɪbreri/', 'I study at the library.', 'Eu estudo na biblioteca.', 'beginner'),
(null, 'Lugares', 'hospital', 'hospital', '/ˈhɑːspɪtəl/', 'The hospital is near here.', 'O hospital fica perto daqui.', 'beginner'),
(null, 'Lugares', 'supermarket', 'supermercado', '/ˈsuːpərmɑːrkɪt/', 'Let''s go to the supermarket.', 'Vamos ao supermercado.', 'beginner'),
(null, 'Lugares', 'park', 'parque', '/pɑːrk/', 'Children play in the park.', 'Crianças brincam no parque.', 'beginner'),
(null, 'Lugares', 'drugstore', 'farmácia', '/ˈdrʌɡstɔːr/', 'Is there a drugstore around here?', 'Tem uma farmácia por aqui?', 'beginner'),
(null, 'Lugares', 'bakery', 'padaria', '/ˈbeɪkəri/', 'I buy bread at the bakery.', 'Compro pão na padaria.', 'beginner'),
(null, 'Lugares', 'mall', 'shopping', '/mɔːl/', 'We went to the mall yesterday.', 'Fomos ao shopping ontem.', 'beginner'),
(null, 'Expressões comuns', 'How are you?', 'Como você está?', '/haʊ ɑːr juː/', 'Hi, John! How are you?', 'Oi, John! Como você está?', 'elementary'),
(null, 'Expressões comuns', 'Nice to meet you', 'Prazer em conhecê-lo', '/naɪs tə miːt juː/', 'Hi, I''m Ana. Nice to meet you!', 'Oi, sou a Ana. Prazer!', 'elementary'),
(null, 'Expressões comuns', 'Never mind', 'Deixa pra lá', '/ˈnevər maɪnd/', 'Never mind, it''s not important.', 'Deixa pra lá, não é importante.', 'elementary'),
(null, 'Expressões comuns', 'Take care', 'Se cuida', '/teɪk ker/', 'Bye! Take care!', 'Tchau! Se cuida!', 'elementary'),
(null, 'Expressões comuns', 'I''m looking forward to it', 'Estou ansioso por isso', '/aɪm ˈlʊkɪŋ ˈfɔːrwərd tuː ɪt/', 'The trip is next week. I''m looking forward to it!', 'A viagem é semana que vem. Mal posso esperar!', 'elementary'),
(null, 'Expressões comuns', 'What do you mean?', 'Como assim?', '/wʌt duː juː miːn/', 'What do you mean? I don''t understand.', 'Como assim? Não entendi.', 'elementary'),
(null, 'Expressões comuns', 'Could you repeat, please?', 'Poderia repetir, por favor?', '/kʊd juː rɪˈpiːt pliːz/', 'Sorry, could you repeat, please?', 'Desculpe, poderia repetir?', 'elementary'),
(null, 'Expressões comuns', 'It depends', 'Depende', '/ɪt dɪˈpendz/', 'Will you come? It depends on the weather.', 'Você vem? Depende do tempo.', 'elementary');

insert into public.grammar_topics (teacher_id, title, level, summary, explanation, examples, exercises, position) values
(null, 'Verb to be', 'beginner', 'Usado para identidade, idade, estado, profissão e localização.', 'O verbo **to be** significa *ser* ou *estar*.

- I **am**
- You / We / They **are**
- He / She / It **is**

Negativa: acrescente **not** (I''m not, she isn''t, they aren''t).
Pergunta: inverta o verbo (**Are** you ready? **Is** he a doctor?).

Atenção: em inglês usamos *to be* para idade: **I am 15 years old** (e não *I have 15 years*).', '[{"en": "I am a student.", "pt": "Eu sou estudante."}, {"en": "She is 15 years old.", "pt": "Ela tem 15 anos."}, {"en": "We are at home.", "pt": "Nós estamos em casa."}, {"en": "Are they from Brazil?", "pt": "Eles são do Brasil?"}]'::jsonb, '[{"prompt": "She ___ my best friend.", "options": ["am", "is", "are"], "answer": 1, "explanation": "He/She/It usa ''is''."}, {"prompt": "They ___ at school now.", "options": ["is", "am", "are"], "answer": 2, "explanation": "They usa ''are''."}, {"prompt": "Como dizer ''Eu tenho 20 anos''?", "options": ["I have 20 years.", "I am 20 years old.", "I is 20 years."], "answer": 1, "explanation": "Idade usa o verbo to be."}, {"prompt": "___ you tired?", "options": ["Is", "Are", "Am"], "answer": 1, "explanation": "Pergunta com ''you'' usa ''Are''."}]'::jsonb, 0),
(null, 'Simple Present', 'beginner', 'Rotinas, hábitos, verdades gerais.', 'Usamos o **Simple Present** para hábitos, rotinas e fatos.

- I / You / We / They **work**
- He / She / It **works** (acrescente -s / -es)

Negativa: **don''t** / **doesn''t** + verbo (She **doesn''t like** coffee).
Pergunta: **Do** / **Does** + sujeito + verbo (**Does** he **play** soccer?).

Com *does/doesn''t* o verbo volta à forma básica, sem -s.', '[{"en": "I study English every day.", "pt": "Eu estudo inglês todo dia."}, {"en": "He works in a bank.", "pt": "Ele trabalha em um banco."}, {"en": "She doesn''t eat meat.", "pt": "Ela não come carne."}, {"en": "Do you like music?", "pt": "Você gosta de música?"}]'::jsonb, '[{"prompt": "She ___ to school by bus.", "options": ["go", "goes", "going"], "answer": 1, "explanation": "Terceira pessoa (she) recebe -es."}, {"prompt": "They ___ like pizza.", "options": ["doesn''t", "don''t", "isn''t"], "answer": 1, "explanation": "They usa don''t."}, {"prompt": "___ he speak French?", "options": ["Do", "Is", "Does"], "answer": 2, "explanation": "He usa does nas perguntas."}, {"prompt": "My father ___ TV at night.", "options": ["watches", "watch", "watchs"], "answer": 0, "explanation": "Verbos terminados em -ch recebem -es."}]'::jsonb, 1),
(null, 'Present Continuous', 'beginner', 'Ações acontecendo agora ou planos próximos.', 'Estrutura: **to be + verbo-ing**.

- I **am studying** now.
- She **is watching** TV.

Usamos para ações em andamento no momento da fala e para planos já combinados (*I''m meeting Ana tomorrow*).

Regras do -ing: make → mak**ing**; run → run**ning**; play → play**ing**.', '[{"en": "I am reading a book.", "pt": "Estou lendo um livro."}, {"en": "They are playing soccer.", "pt": "Eles estão jogando futebol."}, {"en": "Is it raining?", "pt": "Está chovendo?"}]'::jsonb, '[{"prompt": "Listen! The baby ___.", "options": ["cries", "is crying", "cry"], "answer": 1, "explanation": "''Listen!'' indica ação agora."}, {"prompt": "We ___ dinner right now.", "options": ["are having", "have", "has"], "answer": 0, "explanation": "Ação em andamento: are + -ing."}, {"prompt": "Forma correta de ''run'' + ing:", "options": ["runing", "running", "runeing"], "answer": 1, "explanation": "Consoante-vogal-consoante: dobra a última letra."}]'::jsonb, 2),
(null, 'Simple Past', 'elementary', 'Ações concluídas no passado.', 'Verbos regulares recebem **-ed** (work → work**ed**, study → stud**ied**).
Verbos irregulares têm forma própria (go → **went**, have → **had**, see → **saw**).

Negativa: **didn''t** + verbo base (I **didn''t go**).
Pergunta: **Did** + sujeito + verbo base (**Did** you **see** it?).

O verbo *to be* no passado: I/he/she/it **was**; you/we/they **were**.', '[{"en": "I visited my grandma yesterday.", "pt": "Visitei minha avó ontem."}, {"en": "She went to the beach.", "pt": "Ela foi à praia."}, {"en": "We didn''t watch the game.", "pt": "Não assistimos ao jogo."}, {"en": "Did you finish your homework?", "pt": "Você terminou a lição?"}]'::jsonb, '[{"prompt": "Yesterday I ___ to the cinema.", "options": ["go", "went", "goed"], "answer": 1, "explanation": "''Go'' é irregular: went."}, {"prompt": "She ___ like the movie.", "options": ["didn''t", "doesn''t", "wasn''t"], "answer": 0, "explanation": "Passado negativo: didn''t."}, {"prompt": "___ you call me last night?", "options": ["Do", "Were", "Did"], "answer": 2, "explanation": "Pergunta no passado: Did."}, {"prompt": "They ___ very happy at the party.", "options": ["was", "were", "are"], "answer": 1, "explanation": "They + were."}]'::jsonb, 3),
(null, 'Future (will / going to)', 'elementary', 'Previsões, decisões e planos.', '**Will** + verbo: decisões no momento, promessas e previsões (*I''ll help you*).
**Going to** + verbo: planos e intenções já decididos ou previsões com evidência (*Look at the clouds! It''s going to rain*).

Negativa: **won''t** / **am not going to**.', '[{"en": "I will call you later.", "pt": "Eu te ligo mais tarde."}, {"en": "We are going to travel in July.", "pt": "Vamos viajar em julho."}, {"en": "It won''t be easy.", "pt": "Não vai ser fácil."}]'::jsonb, '[{"prompt": "The phone is ringing. I ___ answer it.", "options": ["will", "am going to", "going"], "answer": 0, "explanation": "Decisão no momento: will."}, {"prompt": "We ___ visit Paris next year. We bought the tickets!", "options": ["will", "are going to", "go"], "answer": 1, "explanation": "Plano já decidido: going to."}, {"prompt": "Negativa de ''will'':", "options": ["willn''t", "won''t", "don''t will"], "answer": 1, "explanation": "will not = won''t."}]'::jsonb, 4),
(null, 'Pronouns', 'beginner', 'Pronomes pessoais, objeto e possessivos.', '**Sujeito:** I, you, he, she, it, we, they.
**Objeto:** me, you, him, her, it, us, them.
**Adjetivos possessivos:** my, your, his, her, its, our, their.
**Pronomes possessivos:** mine, yours, his, hers, ours, theirs.

Exemplo: *She* loves *him*. This is *her* book. The book is *hers*.', '[{"en": "Call me later.", "pt": "Me ligue mais tarde."}, {"en": "This is our house.", "pt": "Esta é a nossa casa."}, {"en": "The red car is mine.", "pt": "O carro vermelho é meu."}]'::jsonb, '[{"prompt": "Can you help ___?", "options": ["I", "me", "my"], "answer": 1, "explanation": "Depois do verbo usamos pronome objeto."}, {"prompt": "This is ___ bag (dela).", "options": ["her", "hers", "she"], "answer": 0, "explanation": "Antes de substantivo: her."}, {"prompt": "The decision is ___ (deles).", "options": ["their", "them", "theirs"], "answer": 2, "explanation": "Sem substantivo depois: theirs."}]'::jsonb, 5),
(null, 'Articles', 'beginner', 'a, an e the.', '**A** antes de som de consoante (*a car, a university*).
**An** antes de som de vogal (*an apple, an hour*).
**The** para algo específico ou já mencionado (*the book on the table*).

Não usamos artigo com generalizações no plural (*Dogs are friendly*).', '[{"en": "I have a dog.", "pt": "Eu tenho um cachorro."}, {"en": "She is an engineer.", "pt": "Ela é engenheira."}, {"en": "The dog is sleeping.", "pt": "O cachorro está dormindo."}]'::jsonb, '[{"prompt": "I need ___ umbrella.", "options": ["a", "an", "the"], "answer": 1, "explanation": "''umbrella'' começa com som de vogal."}, {"prompt": "She''s ___ teacher.", "options": ["a", "an", "—"], "answer": 0, "explanation": "Profissões levam a/an."}, {"prompt": "Close ___ door, please.", "options": ["a", "an", "the"], "answer": 2, "explanation": "Porta específica: the."}, {"prompt": "It takes ___ hour.", "options": ["a", "an", "the"], "answer": 1, "explanation": "''hour'' tem h mudo: an."}]'::jsonb, 6),
(null, 'Prepositions (in, on, at)', 'elementary', 'Preposições de tempo e lugar.', '**Tempo:**
- **at** horas (*at 7 p.m.*)
- **on** dias e datas (*on Monday, on May 5th*)
- **in** meses, anos, estações e partes do dia (*in July, in 2025, in the morning*)

**Lugar:**
- **in** dentro (*in the box, in Brazil*)
- **on** sobre uma superfície (*on the table*)
- **at** ponto específico (*at the bus stop, at school*)', '[{"en": "The class starts at 8.", "pt": "A aula começa às 8."}, {"en": "My birthday is on Friday.", "pt": "Meu aniversário é na sexta."}, {"en": "I live in São Paulo.", "pt": "Eu moro em São Paulo."}]'::jsonb, '[{"prompt": "See you ___ Monday!", "options": ["in", "on", "at"], "answer": 1, "explanation": "Dias da semana: on."}, {"prompt": "I was born ___ 2010.", "options": ["in", "on", "at"], "answer": 0, "explanation": "Anos: in."}, {"prompt": "The keys are ___ the table.", "options": ["in", "at", "on"], "answer": 2, "explanation": "Sobre uma superfície: on."}, {"prompt": "Let''s meet ___ the bus stop.", "options": ["at", "in", "on"], "answer": 0, "explanation": "Ponto específico: at."}]'::jsonb, 7),
(null, 'Modal verbs', 'intermediate', 'can, could, should, must, might.', 'Verbos modais são seguidos do verbo na forma base, sem *to*.

- **can**: habilidade / permissão (*I can swim*)
- **could**: passado de can / pedido educado (*Could you help me?*)
- **should**: conselho (*You should rest*)
- **must**: obrigação forte / dedução (*You must wear a seatbelt*)
- **might**: possibilidade (*It might rain*)', '[{"en": "Can you speak English?", "pt": "Você sabe falar inglês?"}, {"en": "You should drink more water.", "pt": "Você deveria beber mais água."}, {"en": "We must be quiet in the library.", "pt": "Precisamos ficar em silêncio na biblioteca."}]'::jsonb, '[{"prompt": "You look tired. You ___ go to bed.", "options": ["should", "can", "might"], "answer": 0, "explanation": "Conselho: should."}, {"prompt": "___ you open the window, please?", "options": ["Must", "Could", "Should"], "answer": 1, "explanation": "Pedido educado: could."}, {"prompt": "She can ___ three languages.", "options": ["speaks", "to speak", "speak"], "answer": 2, "explanation": "Depois de modal: verbo base."}]'::jsonb, 8),
(null, 'Comparatives and superlatives', 'elementary', 'Comparar pessoas e coisas.', '**Adjetivos curtos:** -er / the -est (*tall → taller → the tallest*).
**Adjetivos longos:** more / the most (*interesting → more interesting → the most interesting*).
**Irregulares:** good → better → the best; bad → worse → the worst.

Comparativo usa **than**: *My brother is taller than me*.', '[{"en": "She is older than her sister.", "pt": "Ela é mais velha que a irmã."}, {"en": "This is the best pizza in town.", "pt": "Esta é a melhor pizza da cidade."}, {"en": "English is more interesting than math.", "pt": "Inglês é mais interessante que matemática."}]'::jsonb, '[{"prompt": "A car is ___ than a bike.", "options": ["fast", "faster", "fastest"], "answer": 1, "explanation": "Comparativo de adjetivo curto: -er + than."}, {"prompt": "This is ___ movie I''ve ever seen.", "options": ["the better", "the best", "the goodest"], "answer": 1, "explanation": "good → the best."}, {"prompt": "This book is ___ than the other.", "options": ["more interesting", "interestinger", "most interesting"], "answer": 0, "explanation": "Adjetivo longo: more."}]'::jsonb, 9);

insert into public.practice_texts (teacher_id, skill, genre, title, level, body, glossary, questions) values
(null, 'reading', 'story', 'A New Friend', 'beginner', 'Tom is twelve years old. He lives in a small town with his parents and his dog, Max. Every morning, Tom walks to school with Max. One day, he sees a new girl in his class. Her name is Lucy. She is from Canada and she doesn''t know anybody. At lunch, Tom sits with Lucy and they talk about their favorite games. Now they are best friends, and Max likes Lucy too!', '[{"word": "town", "translation": "cidade pequena"}, {"word": "anybody", "translation": "ninguém / alguém"}, {"word": "favorite", "translation": "favorito"}]'::jsonb, '[{"prompt": "How old is Tom?", "options": ["Ten", "Twelve", "Fifteen"], "answer": 1}, {"prompt": "Where is Lucy from?", "options": ["Canada", "Brazil", "England"], "answer": 0}, {"prompt": "What do Tom and Lucy talk about?", "options": ["School", "Food", "Games"], "answer": 2}]'::jsonb),
(null, 'reading', 'news', 'City Opens a New Library', 'elementary', 'Last Saturday, the city opened a new public library downtown. The building has three floors, a café and a special area for children. More than 2,000 people visited the library on the first day. "We want everybody to read more," said the mayor. The library is open from 8 a.m. to 9 p.m., and it is free for all residents. Next month, it will offer free English classes for adults.', '[{"word": "downtown", "translation": "no centro"}, {"word": "floor", "translation": "andar"}, {"word": "mayor", "translation": "prefeito(a)"}, {"word": "residents", "translation": "moradores"}]'::jsonb, '[{"prompt": "When did the library open?", "options": ["Last Saturday", "Last Monday", "Next month"], "answer": 0}, {"prompt": "How many people visited on the first day?", "options": ["200", "More than 2,000", "20,000"], "answer": 1}, {"prompt": "What will the library offer next month?", "options": ["Free coffee", "Free English classes", "Free books for children"], "answer": 1}]'::jsonb),
(null, 'reading', 'article', 'Why Sleep Is Important', 'intermediate', 'Scientists say that teenagers need between eight and ten hours of sleep every night. However, many young people sleep less because they use their phones late at night. The light from screens can make it harder to fall asleep. Lack of sleep can affect memory, mood and school performance. Experts recommend turning off devices at least one hour before bed and keeping a regular sleep schedule, even on weekends.', '[{"word": "however", "translation": "no entanto"}, {"word": "fall asleep", "translation": "pegar no sono"}, {"word": "lack of", "translation": "falta de"}, {"word": "schedule", "translation": "horário / rotina"}]'::jsonb, '[{"prompt": "How many hours of sleep do teenagers need?", "options": ["Six to seven", "Eight to ten", "Eleven to twelve"], "answer": 1}, {"prompt": "What can make it harder to fall asleep?", "options": ["Light from screens", "Reading books", "Exercise"], "answer": 0}, {"prompt": "What do experts recommend?", "options": ["Sleep only on weekends", "Turn off devices one hour before bed", "Drink coffee at night"], "answer": 1}]'::jsonb),
(null, 'listening', 'dialogue', 'At the Restaurant', 'beginner', 'Waiter: Good evening! Are you ready to order?
Customer: Yes, please. I''d like the chicken with rice.
Waiter: Would you like something to drink?
Customer: An orange juice, please.
Waiter: Anything else?
Customer: No, thank you. Oh, can I have the bill later?
Waiter: Of course. Enjoy your meal!', '[{"word": "order", "translation": "pedir"}, {"word": "bill", "translation": "conta"}, {"word": "Enjoy your meal", "translation": "Bom apetite"}]'::jsonb, '[{"prompt": "What does the customer order to eat?", "options": ["Fish and salad", "Chicken with rice", "Pizza"], "answer": 1}, {"prompt": "What does the customer want to drink?", "options": ["Water", "Coffee", "Orange juice"], "answer": 2}, {"prompt": "What does the waiter say at the end?", "options": ["Enjoy your meal!", "Good morning!", "See you tomorrow!"], "answer": 0}]'::jsonb),
(null, 'listening', 'dialogue', 'Introducing Yourself', 'beginner', 'Anna: Hi! I''m Anna. What''s your name?
Pedro: Hi, Anna. My name is Pedro. Nice to meet you.
Anna: Nice to meet you too. Where are you from?
Pedro: I''m from Brazil. I live in Recife. And you?
Anna: I''m from Ireland. How old are you, Pedro?
Pedro: I''m sixteen years old. I love music and soccer.
Anna: Cool! I love music too.', '[{"word": "Nice to meet you", "translation": "Prazer em conhecê-lo"}, {"word": "Where are you from?", "translation": "De onde você é?"}]'::jsonb, '[{"prompt": "Where is Pedro from?", "options": ["Ireland", "Brazil", "Portugal"], "answer": 1}, {"prompt": "How old is Pedro?", "options": ["Fifteen", "Sixteen", "Sixty"], "answer": 1}, {"prompt": "What do Anna and Pedro both love?", "options": ["Soccer", "Music", "Movies"], "answer": 1}]'::jsonb),
(null, 'listening', 'dialogue', 'Checking In at a Hotel', 'elementary', 'Receptionist: Good afternoon. How can I help you?
Guest: Hi, I have a reservation under the name Silva.
Receptionist: Let me check... Yes, a double room for three nights. Can I see your passport, please?
Guest: Sure, here it is. What time is breakfast?
Receptionist: Breakfast is served from 7 to 10 a.m. on the first floor. Your room is 305, and here is your key card.
Guest: Thank you. Is there Wi-Fi in the room?
Receptionist: Yes, the password is on the card.', '[{"word": "reservation", "translation": "reserva"}, {"word": "double room", "translation": "quarto de casal"}, {"word": "key card", "translation": "cartão-chave"}]'::jsonb, '[{"prompt": "How many nights will the guest stay?", "options": ["Two", "Three", "Five"], "answer": 1}, {"prompt": "Where is breakfast served?", "options": ["In the room", "On the first floor", "On the third floor"], "answer": 1}, {"prompt": "Where is the Wi-Fi password?", "options": ["On the key card", "On the passport", "On the wall"], "answer": 0}]'::jsonb);
