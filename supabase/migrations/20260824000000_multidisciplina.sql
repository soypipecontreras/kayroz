-- Multi-disciplina (Fase G): Kayroz deja de asumir "gimnasio" como única
-- disciplina. Ejercicios, plantillas y atletas ahora declaran disciplina(s):
-- gimnasio, calistenia, crossfit, hyrox, funcional.
--
-- Decisiones:
-- - `exercises.disciplinas` es un ARRAY: un burpee es de crossfit, hyrox,
--   funcional y calistenia a la vez. Una plantilla en cambio ES de una
--   disciplina (`routine_templates.disciplina` text simple).
-- - El perfil del atleta (objetivo/nivel/disciplinas/dias_semana) vive en
--   `athletes` y lo edita el propio atleta desde /app/perfil — es el insumo
--   del recomendador de rutinas (Fase H).
-- - Los ejercicios nuevos heredan el ícono genérico de su `tipo` copiando el
--   imagen_url más repetido entre los globales existentes del mismo tipo
--   (el más repetido = el genérico; los dibujos a mano son 1 fila cada uno).
--   Así no se hardcodea ninguna URL de bucket en la migración.

-- ============================================================
-- 1. Columnas de disciplina
-- ============================================================

alter table exercises
  add column disciplinas text[] not null default '{gimnasio}';

alter table exercises add constraint exercises_disciplinas_validas
  check (disciplinas <@ array['gimnasio','calistenia','crossfit','hyrox','funcional']::text[]);

comment on column exercises.disciplinas is
  'Disciplinas donde este ejercicio se usa. Array porque un mismo movimiento cruza disciplinas.';

alter table routine_templates
  add column disciplina text not null default 'gimnasio'
    check (disciplina in ('gimnasio','calistenia','crossfit','hyrox','funcional')),
  add column nivel text
    check (nivel in ('principiante','intermedio','avanzado')),
  add column objetivo text
    check (objetivo in ('fuerza','hipertrofia','resistencia','perdida_grasa','salud_general','competencia')),
  add column modalidad text not null default 'series'
    check (modalidad in ('series','amrap','emom','fortime','circuito')),
  add column duracion_min smallint check (duracion_min > 0),
  add column dias_semana smallint check (dias_semana between 1 and 7);

comment on column routine_templates.modalidad is
  'series = sets/reps clásico; amrap/emom/fortime = WODs; circuito = rondas seguidas. El portal lo muestra como contexto, el shape de los ejercicios es el mismo.';
comment on column routine_templates.dias_semana is
  'Frecuencia semanal para la que está pensada la sesión — insumo del recomendador, no un scheduler.';

-- Perfil de entrenamiento del atleta (lo edita él mismo en /app/perfil).
alter table athletes
  add column objetivo text
    check (objetivo in ('fuerza','hipertrofia','resistencia','perdida_grasa','salud_general','competencia')),
  add column nivel text
    check (nivel in ('principiante','intermedio','avanzado')),
  add column disciplinas text[] not null default '{}',
  add column dias_semana smallint check (dias_semana between 1 and 7);

alter table athletes add constraint athletes_disciplinas_validas
  check (disciplinas <@ array['gimnasio','calistenia','crossfit','hyrox','funcional']::text[]);

-- ============================================================
-- 2. Etiquetar el catálogo existente (45 globales, hoy todos '{gimnasio}')
-- ============================================================

-- Los de peso corporal son también material de calistenia.
update exercises set disciplinas = array['gimnasio','calistenia']
  where es_global and tipo = 'peso_corporal';

-- Básicos de barra que aparecen en WODs todo el tiempo.
update exercises set disciplinas = array['gimnasio','crossfit']
  where es_global and nombre_canonico in ('Sentadilla', 'Peso muerto', 'Press militar');

update exercises set disciplinas = array['gimnasio','calistenia','crossfit']
  where es_global and nombre_canonico in ('Dominadas', 'Fondos en paralelas');

update exercises set disciplinas = array['gimnasio','funcional']
  where es_global and nombre_canonico in ('Zancadas', 'Caminadora', 'Bicicleta estática');

-- ============================================================
-- 3. Ejercicios nuevos: calistenia, crossfit, hyrox, funcional
-- ============================================================
-- Mismo formato que el seed original (nombre canónico en español, instrucción
-- de 1 frase) + guía de técnica (preparacion/ejecucion/errores) como la que ya
-- tienen los 45 del catálogo, para que "Cómo se hace" funcione desde el día 1.

insert into exercises
  (nombre_canonico, grupo_muscular, tipo, es_global, disciplinas, instrucciones, preparacion, ejecucion, errores)
values

-- ---- Calistenia ----
('Flexiones', 'pecho', 'peso_corporal', true,
 array['gimnasio','calistenia','crossfit','funcional'],
 'Con el cuerpo en línea recta, baja el pecho casi hasta el piso y empuja de vuelta arriba sin quebrar la cadera.',
 'Manos al ancho de hombros o apenas más abierto, dedos apuntando al frente. Cuerpo en línea recta de cabeza a talones, abdomen y glúteos apretados.',
 'Bajá flexionando los codos a unos 45° del torso hasta que el pecho casi toque el piso, y empujá el piso hasta extender los brazos. Inhalá al bajar, exhalá al subir. Si todavía no salen, apoyá las rodillas o empujá desde una superficie elevada.',
 array['Dejar caer la cadera o levantarla en carpa — el cuerpo deja de ser una línea.',
       'Abrir los codos a 90° del torso: castiga los hombros. Mantenelos a ~45°.',
       'Recortar el recorrido: el pecho baja hasta casi tocar el piso, no hasta la mitad.']),

('Sentadilla al aire', 'pierna', 'peso_corporal', true,
 array['calistenia','crossfit','funcional','hyrox'],
 'Baja la cadera hacia atrás y abajo hasta romper la paralela y sube empujando con toda la planta del pie.',
 'Pies al ancho de hombros, puntas levemente hacia afuera, brazos al frente como contrapeso.',
 'Bajá la cadera hacia atrás y abajo manteniendo el pecho arriba hasta que la cadera pase la línea de las rodillas, y subí empujando el piso. El peso reparte en toda la planta, los talones nunca se despegan.',
 array['Levantar los talones: si pasa, abrí un poco más los pies o trabajá movilidad de tobillo.',
       'Dejar que las rodillas colapsen hacia adentro.',
       'Quedarse corto de profundidad — en crossfit la repetición vale cuando la cadera rompe la paralela.']),

('Remo invertido', 'espalda', 'peso_corporal', true,
 array['calistenia','gimnasio'],
 'Colgado bajo una barra baja con el cuerpo recto, jala el pecho hacia la barra apretando los omóplatos.',
 'Barra a la altura de la cadera (o anillas/mesa firme). Agarrate con las manos al ancho de hombros y caminá los pies al frente hasta quedar inclinado, cuerpo en línea recta.',
 'Jalá el pecho hacia la barra llevando los codos atrás y apretando los omóplatos, y bajá controlado hasta extender los brazos. Cuanto más horizontal el cuerpo, más difícil.',
 array['Quebrar la cadera: el cuerpo sube en bloque, como una plancha que rema.',
       'Encoger los hombros hacia las orejas en vez de deprimirlos.',
       'Recorrido a medias: el pecho toca (o casi toca) la barra en cada repetición.']),

('Muscle-up', 'espalda', 'peso_corporal', true,
 array['calistenia','crossfit'],
 'Desde el colgado, jala explosivo hasta pasar el pecho sobre la barra y remata con un fondo hasta extender los brazos.',
 'Colgado de la barra con agarre falso o prono, hombros activos, cuerpo apretado. Es un ejercicio avanzado: primero hay que dominar dominadas y fondos con margen.',
 'Impulsá con un kip o jalón explosivo llevando la barra hacia la cadera, pasá los codos por encima en la transición y empujá el fondo hasta extender los brazos arriba de la barra. Bajá por el mismo camino, controlado.',
 array['Intentarlo sin la base: si no salen ~8 dominadas estrictas y ~8 fondos, todavía no toca.',
       'Jalar la barra hacia la pera en vez de hacia la cadera — la transición muere ahí.',
       'Pasar un codo primero y el otro después (chicken wing): pierde fuerza y castiga los hombros.']),

('Sentadilla a una pierna', 'pierna', 'peso_corporal', true,
 array['calistenia'],
 'De pie sobre una pierna, baja la cadera hasta abajo con la otra pierna extendida al frente y sube sin apoyarla.',
 'Parate sobre una pierna con la otra extendida al frente y los brazos como contrapeso. Empezá sosteniéndote de un marco o bajando a un cajón.',
 'Bajá la cadera hacia atrás y abajo lo más profundo que puedas manteniendo el talón apoyado y la pierna libre al frente, y subí empujando el piso. Progresá bajando cada vez más antes de intentar la libre.',
 array['Dejar que la rodilla colapse hacia adentro.',
       'Despegar el talón del piso — trabajá movilidad de tobillo antes de forzar profundidad.',
       'Ir directo a la versión libre: el cajón y el soporte son etapas, no trampa.']),

('Flexiones de pino', 'hombro', 'peso_corporal', true,
 array['calistenia','crossfit'],
 'Invertido contra la pared, baja la cabeza controlada hasta casi tocar el piso y empuja hasta extender los brazos.',
 'Subí a la posición de pino con el pecho o la espalda contra la pared, manos apenas más abiertas que los hombros, a un palmo de la pared.',
 'Bajá flexionando los codos hasta que la cabeza casi toque el piso y empujá de vuelta hasta extender los brazos. Cuerpo apretado todo el tiempo. Si todavía no salen, empezá con flexiones pica (cadera arriba, pies en el piso o en un cajón).',
 array['Arquear la espalda baja como un escorpión: costillas adentro, glúteos apretados.',
       'Apoyar la cabeza de golpe — el descenso se controla siempre.',
       'Saltarse la progresión: pica → pica elevada → pino asistido. El hombro agradece la paciencia.']),

('L-sit', 'core', 'peso_corporal', true,
 array['calistenia'],
 'Sostenido en paralelas o en el piso, mantén las piernas extendidas al frente en 90° con los brazos rectos.',
 'Sentate entre paralelas bajas (o con las manos al costado de la cadera en el piso), brazos extendidos, hombros deprimidos lejos de las orejas.',
 'Empujá el piso para despegar la cadera y llevá las piernas extendidas al frente hasta formar una L. Acumulá segundos: series cortas de 5-15 s suman más que un intento largo que se cae. Con rodillas recogidas también cuenta como progresión.',
 array['Encoger los hombros: empujá el piso lejos, cuello largo.',
       'Doblar las rodillas sin darse cuenta — si pasa, volvé a la progresión con rodillas recogidas a propósito.',
       'Aguantar la respiración: respirá corto y seguido.']),

('Burpee', 'cardio', 'peso_corporal', true,
 array['crossfit','hyrox','funcional','calistenia'],
 'Del pecho al piso a un salto con palmada arriba, en un solo movimiento fluido.',
 'De pie, pies al ancho de cadera. No hay más preparación que decidirse.',
 'Bajá las manos al piso, tirá los pies atrás y tocá el piso con el pecho; empujá, recogé los pies hacia las manos y saltá extendiendo la cadera con palmada arriba de la cabeza. Encontrá un ritmo sostenible antes que velocidad.',
 array['No tocar el pecho al piso — en competencia esa repetición no vale.',
       'Arquear la espalda al levantarse en vez de recoger los pies bajo el cuerpo.',
       'Salir a ritmo de sprint en el minuto 1 y morir en el 3: el burpee castiga al impaciente.']),

('Escaladores', 'core', 'peso_corporal', true,
 array['funcional','crossfit'],
 'En posición de plancha alta, lleva las rodillas al pecho alternando rápido sin levantar la cadera.',
 'Plancha alta: manos bajo los hombros, cuerpo en línea recta, abdomen apretado.',
 'Llevá una rodilla al pecho y volvela mientras traés la otra, alternando a ritmo constante. La cadera se queda quieta y baja; el movimiento sale de las piernas, no del rebote del tronco.',
 array['Levantar la cadera en carpa para "correr" más rápido.',
       'Apoyar el peso hacia atrás — los hombros se quedan sobre las manos.',
       'Recortar el recorrido: la rodilla viaja hasta el pecho, no hasta la mitad.']),

-- ---- CrossFit ----
('Thruster', 'pierna', 'barra', true,
 array['crossfit','funcional'],
 'Sentadilla frontal y press por encima de la cabeza en un solo movimiento continuo.',
 'Barra en rack frontal: sobre los hombros, codos altos, agarre apenas más abierto que los hombros. Pies al ancho de hombros.',
 'Bajá a una sentadilla frontal completa y, al subir, usá el impulso de la cadera para empujar la barra en línea recta hasta extender los brazos arriba de la cabeza. La barra baja de vuelta a los hombros mientras ya vas bajando a la siguiente repetición.',
 array['Separar la sentadilla del press: es UN movimiento — el empuje de las piernas hace el press.',
       'Dejar caer los codos en el rack frontal: la barra se va al frente y la espalda paga.',
       'Terminar con la barra adelante de la cabeza en vez de sobre los talones.']),

('Wall ball', 'pierna', 'mancuerna', true,
 array['crossfit','hyrox','funcional'],
 'Con el balón medicinal al pecho, haz una sentadilla y al subir lánzalo al objetivo en la pared; recíbelo y repite.',
 'De frente a la pared a un paso de distancia, balón medicinal sostenido al pecho, pies al ancho de hombros.',
 'Bajá a sentadilla completa con el balón al pecho y, al subir, usá el envión de las piernas para lanzarlo al objetivo (3 m mujeres / 3,05 m hombres en competencia). Recibilo absorbiendo con las piernas, ya bajando a la siguiente.',
 array['Recibir el balón con los brazos y recién después hacer la sentadilla: se recibe bajando.',
       'Quedarse corto de profundidad — la cadera rompe la paralela en cada repetición.',
       'Lanzar con los brazos: la fuerza sale de las piernas, los brazos solo guían.']),

('Kettlebell swing', 'gluteo', 'mancuerna', true,
 array['crossfit','hyrox','funcional'],
 'Balancea la pesa rusa desde entre las piernas hasta la altura del pecho con un golpe seco de cadera.',
 'Pesa rusa un paso al frente. Bisagra de cadera, espalda neutra, agarrala con las dos manos y hamacala hacia atrás entre las piernas para arrancar.',
 'Extendé la cadera con un golpe seco — glúteos apretados, piernas rectas — y dejá que la pesa flote hasta el pecho con los brazos relajados. Recibila con la cadera hacia atrás, no con la espalda redonda, y encadená el siguiente swing.',
 array['Hacer sentadilla en vez de bisagra: el swing es cadera atrás-adelante, no arriba-abajo.',
       'Levantar la pesa con los brazos — los brazos son sogas, el motor es la cadera.',
       'Redondear la espalda al recibir la pesa entre las piernas.']),

('Saltos dobles', 'cardio', 'peso_corporal', true,
 array['crossfit','funcional'],
 'Salto de cuerda donde la cuerda pasa dos veces bajo los pies por cada salto.',
 'Cuerda a la medida (parado sobre el medio, los mangos llegan a las axilas). Codos pegados al torso, mirada al frente.',
 'Saltá apenas más alto que en el salto simple y acelerá el giro con las muñecas — no con los brazos — para que la cuerda pase dos veces. Practicá: simple-simple-doble hasta encadenar dobles seguidos.',
 array['Saltar en carpa o talonear: el salto es vertical, tobillos como resortes.',
       'Girar con los hombros y abrir los brazos — la cuerda se acorta y golpea los pies.',
       'Mirar los pies: la cabeza va erguida, la cuerda se siente, no se mira.']),

('Salto al cajón', 'pierna', 'peso_corporal', true,
 array['crossfit','funcional','hyrox'],
 'Salta al cajón con los dos pies, extiende la cadera por completo arriba y baja controlado.',
 'De frente al cajón, a un palmo de distancia, pies al ancho de cadera.',
 'Cargá con un cuarto de sentadilla, impulsá con los brazos y saltá aterrizando con toda la planta sobre el cajón. Extendé la cadera por completo arriba y bajá de un paso (o de un salto suave si ya tenés técnica).',
 array['Aterrizar en el borde o con los talones en el aire.',
       'No extender la cadera arriba: la repetición termina de pie, no agachado.',
       'Bajar saltando hacia atrás sin mirar — el tendón de Aquiles no perdona; bajar de un paso es más sostenible.']),

('Cargada de potencia', 'otro', 'barra', true,
 array['crossfit','gimnasio'],
 'Lleva la barra del piso a los hombros en un movimiento explosivo, recibiéndola en cuarto de sentadilla.',
 'Barra sobre el medio pie, agarre apenas más abierto que los hombros, cadera abajo, pecho arriba, espalda tensa.',
 'Despegá empujando el piso con las piernas; cuando la barra pasa la rodilla, extendé la cadera explosiva, encogé los hombros y metete abajo recibiendo la barra en los hombros con los codos altos, en cuarto de sentadilla. Parate para terminar.',
 array['Jalar con los brazos antes de que la cadera termine de extender — primero piernas y cadera, después brazos.',
       'Dejar que la barra se aleje del cuerpo: sube pegada, casi rozando.',
       'Recibir con los codos bajos: la barra aplasta las muñecas en vez de apoyarse en los hombros.']),

('Push press', 'hombro', 'barra', true,
 array['crossfit','gimnasio'],
 'Empuja la barra desde los hombros hasta arriba de la cabeza usando un envión corto de piernas.',
 'Barra en los hombros, agarre apenas más abierto que ellos, codos un poco al frente, pies al ancho de cadera.',
 'Flexioná apenas las rodillas (un envión corto y vertical, el torso no se inclina) y extendé piernas y brazos empujando la barra en línea recta hasta arriba de la cabeza, terminando con la barra sobre los talones. Bajala controlada a los hombros.',
 array['Convertir el envión en media sentadilla: es un dip corto, de 10-15 cm.',
       'Inclinar el torso al frente en el dip — la barra sale disparada hacia adelante.',
       'Sacar la cabeza demasiado: la barra pasa cerca de la cara y la cabeza vuelve a su lugar, no al revés.']),

('Rodillas al pecho colgado', 'core', 'peso_corporal', true,
 array['crossfit','calistenia'],
 'Colgado de la barra, lleva los pies (o las rodillas) hasta tocar la barra controlando el balanceo.',
 'Colgado de la barra con agarre prono al ancho de hombros, hombros activos, cuerpo apretado.',
 'Llevá las piernas arriba hasta que los pies toquen la barra (toes to bar) o las rodillas lleguen al pecho, usando el ritmo de hombro (arco hueco-cerrado) para encadenar repeticiones. Bajá controlado, sin dejarte caer.',
 array['Balancearse sin control: el kip es un ritmo, no un péndulo desbocado.',
       'Doblar los brazos para "acercarse" a la barra.',
       'Perder el apretón del cuerpo: colgado flojo, el hombro sufre.']),

('Arrancada', 'otro', 'barra', true,
 array['crossfit'],
 'Lleva la barra del piso hasta arriba de la cabeza en un solo movimiento explosivo.',
 'Agarre bien abierto (la barra queda en el pliegue de la cadera de pie), cadera abajo, pecho arriba, espalda tensa. Es el levantamiento más técnico que existe: aprendelo con carga liviana y, si se puede, con un coach mirando.',
 'Despegá con las piernas, extendé la cadera explosiva cuando la barra pasa la rodilla y metete abajo recibiendo la barra con los brazos extendidos arriba de la cabeza, en sentadilla o potencia. Parate con la barra estable sobre los talones.',
 array['Subir de peso antes de que la técnica esté: la arrancada castiga el ego más que ningún otro ejercicio.',
       'Jalar con los brazos en vez de extender la cadera.',
       'Recibir la barra adelante de la cabeza — se recibe sobre los talones, brazos bloqueados.']),

('Remo ergómetro', 'cardio', 'maquina', true,
 array['crossfit','hyrox','funcional'],
 'Rema en el ergómetro con la secuencia piernas-tronco-brazos, y regresa en el orden inverso.',
 'Pies sujetos en la plataforma, agarre relajado, espalda neutra. Rodillas flexionadas y tronco apenas inclinado al frente para tomar la palanca.',
 'Empujá primero con las piernas, después abrí el tronco hacia atrás y por último jalá con los brazos hasta las costillas bajas. Volvé en orden inverso: brazos, tronco, piernas. La fuerza sale ~60% piernas, 30% tronco, 10% brazos.',
 array['Jalar con los brazos primero: la secuencia es piernas → tronco → brazos.',
       'Redondear la espalda en la toma.',
       'Subir el damper a 10 creyendo que es "más difícil = mejor": entre 4 y 6 rinde más para casi todo el mundo.']),

('Bicicleta de aire', 'cardio', 'maquina', true,
 array['crossfit','funcional','hyrox'],
 'Pedalea y empuja/jala las manijas a la vez; la resistencia crece cuanto más fuerte le das.',
 'Ajustá el asiento para que la rodilla quede apenas flexionada abajo. Agarre firme pero no crispado en las manijas.',
 'Empujá y jalá las manijas mientras pedaleás, repartiendo el esfuerzo entre brazos y piernas. Es de los aparatos más duros que existen: dosificá — un ritmo parejo rinde más que arranques heroicos.',
 array['Usar solo las piernas y dejar los brazos de adorno.',
       'Encorvarse sobre las manijas cuando llega el cansancio.',
       'Salir al 100% de entrada: la bici de aire cobra intereses.']),

-- ---- Hyrox ----
('Carrera', 'cardio', 'peso_corporal', true,
 array['hyrox','funcional','crossfit'],
 'Corre la distancia indicada a ritmo sostenido; en Hyrox es 1 km entre cada estación.',
 'Poca ciencia para arrancar: calzado cómodo y un ritmo que puedas sostener. En Hyrox se corren 8 km en total, siempre con fatiga encima.',
 'Corré erguido, con pasos cortos y frecuentes (~170-180 por minuto) aterrizando bajo el cuerpo. En entrenamientos por estaciones, salí de cada estación un punto más lento de lo que el cuerpo pide: la carrera es donde se recupera o se muere.',
 array['Salir a ritmo de carrera fresca después de una estación fuerte — el pulso no baja más.',
       'Zancadas largas aterrizando con el talón adelante del cuerpo.',
       'Entrenar solo estaciones y descuidar el correr: la mitad de un Hyrox es correr.']),

('Ski ergómetro', 'cardio', 'maquina', true,
 array['hyrox','crossfit','funcional'],
 'Jala las manijas de arriba hacia abajo con todo el cuerpo, como en esquí de fondo.',
 'De pie frente al ergómetro, manijas tomadas arriba, brazos extendidos, cadera apenas flexionada.',
 'Jalá las manijas hacia abajo y atrás flexionando la cadera y terminando con las manos pasando la cadera, y volvé arriba extendiéndote completo. Es un crunch con brazos: el motor es el tronco y el dorsal, no los bíceps.',
 array['Jalar solo con los brazos, con el cuerpo tieso.',
       'Doblar las rodillas como sentadilla: es bisagra de cadera con caída del tronco.',
       'Recorrido corto arriba: los brazos vuelven bien extendidos en cada repetición.']),

('Empuje de trineo', 'pierna', 'maquina', true,
 array['hyrox','funcional','crossfit'],
 'Empuja el trineo cargado manteniendo el cuerpo en diagonal y pasos cortos y potentes.',
 'Manos en los postes a la altura que te deje el cuerpo en diagonal (brazos extendidos o codos flexionados), espalda neutra, core apretado.',
 'Empujá con pasos cortos y agresivos, manteniendo la diagonal cuerpo-trineo constante. La fuerza viaja de las piernas al trineo a través de un tronco rígido. En Hyrox son 4×12,5 m con el trineo pesado: ritmo, no sprint.',
 array['Ponerse demasiado vertical: el empuje se hace con el cuerpo en diagonal.',
       'Pasos largos y lentos — el trineo se frena entre paso y paso y arrancarlo cuesta doble.',
       'Aguantar la respiración todo el tramo.']),

('Arrastre de trineo', 'espalda', 'maquina', true,
 array['hyrox','funcional'],
 'Jala el trineo hacia ti con la cuerda, mano sobre mano, usando piernas y espalda.',
 'Tomá la cuerda con los brazos extendidos, cadera baja, pecho arriba, un pie más atrás que el otro para hacer base.',
 'Jalá mano sobre mano llevando el codo hacia atrás mientras empujás con las piernas, o retrocedé con la cuerda tensa según la regla del evento. El tronco se queda firme; la espalda jala, la zona lumbar no se redondea.',
 array['Jalar solo con los brazos, de pie y tieso — las piernas y el peso corporal hacen la mitad del trabajo.',
       'Redondear la espalda baja cuando llega el cansancio.',
       'Dejar la cuerda floja entre jalón y jalón: el trineo se frena y arrancarlo de nuevo cuesta más.']),

('Burpee con salto largo', 'cardio', 'peso_corporal', true,
 array['hyrox'],
 'Burpee con pecho al piso seguido de un salto largo hacia adelante; se avanza la distancia indicada.',
 'De pie al inicio del tramo. En Hyrox son 80 m: pensalo como una caminata con burpees, no como una serie de saltos.',
 'Hacé el burpee con el pecho al piso, levantate y saltá hacia adelante con los dos pies aterrizando estable, y encadená el siguiente. Un salto mediano y constante rinde más que saltos máximos que destrozan las piernas para lo que viene.',
 array['Saltar lo más largo posible cada vez: las piernas llegan muertas a las zancadas y wall balls.',
       'No apoyar el pecho al piso en el burpee — repetición inválida en competencia.',
       'Aterrizar con las rodillas rígidas: absorbé flexionando.']),

('Caminata del granjero', 'otro', 'mancuerna', true,
 array['hyrox','funcional','crossfit'],
 'Camina la distancia indicada cargando una pesa pesada en cada mano, erguido y a paso firme.',
 'Una pesa rusa o mancuerna pesada a cada lado. Levantalas con la espalda neutra, como un peso muerto.',
 'Caminá erguido, hombros atrás y abajo, agarre firme y pasos rápidos y cortos. El core se queda apretado para que el peso no te ladee. En Hyrox son 200 m con kettlebells: partí el tramo con pausas cortas antes de que el agarre falle del todo.',
 array['Encorvarse hacia adelante o ladearse a un costado.',
       'Pasos largos: con carga pesada el paso corto y frecuente es más estable.',
       'No entrenar el agarre — en la caminata del granjero el que se rinde primero suele ser el antebrazo.']),

('Zancadas con saco', 'pierna', 'mancuerna', true,
 array['hyrox','funcional'],
 'Avanza en zancadas con el saco sobre los hombros; la rodilla de atrás toca el piso en cada paso.',
 'Saco (sandbag) sobre los hombros, detrás del cuello, agarrado con las dos manos. Torso erguido.',
 'Da un paso al frente y bajá hasta que la rodilla de atrás toque el piso, empujá con la pierna delantera y encadená el paso siguiente sin pausa arriba. En Hyrox son 100 m: encontrá un ritmo constante y no lo sueltes.',
 array['Inclinar el torso al frente bajo el peso del saco.',
       'No tocar el piso con la rodilla de atrás — en competencia la repetición no vale.',
       'Empujar con la pierna de atrás en vez de con la delantera.']),

-- ---- Funcional ----
('Azote de balón', 'otro', 'mancuerna', true,
 array['funcional','crossfit'],
 'Levanta el balón del piso por encima de la cabeza y azótalo contra el piso con todo el cuerpo.',
 'Balón de azote (slam ball) entre los pies, pies al ancho de hombros.',
 'Levantá el balón extendiendo cadera y brazos hasta arriba de la cabeza, poniéndote de puntas, y azotalo contra el piso con todo el tronco mientras bajás en sentadilla para recibirlo en el rebote (o levantarlo del piso). Todo el cuerpo participa, la espalda nunca se redondea.',
 array['Tirarlo solo con los brazos, sin extender el cuerpo completo.',
       'Redondear la espalda para levantarlo del piso.',
       'Usar un balón que rebota (medicinal duro) — el de azote es de arena, muerto a propósito.'])
;

-- Alias regionales/coloquiales para el parser y el buscador.
insert into exercise_aliases (alias, exercise_id)
select v.alias, e.id
from (values
  ('Flexiones', 'lagartijas'), ('Flexiones', 'push ups'), ('Flexiones', 'pushups'), ('Flexiones', 'flexiones de brazo'), ('Flexiones', 'planchas de pecho'),
  ('Sentadilla al aire', 'air squat'), ('Sentadilla al aire', 'sentadilla libre'), ('Sentadilla al aire', 'sentadilla sin peso'),
  ('Remo invertido', 'australian pull up'), ('Remo invertido', 'remo australiano'), ('Remo invertido', 'inverted row'),
  ('Muscle-up', 'muscle up'), ('Muscle-up', 'mu'), ('Muscle-up', 'bar muscle up'),
  ('Sentadilla a una pierna', 'pistol'), ('Sentadilla a una pierna', 'pistol squat'), ('Sentadilla a una pierna', 'sentadilla pistola'),
  ('Flexiones de pino', 'hspu'), ('Flexiones de pino', 'handstand push up'), ('Flexiones de pino', 'flexion de pino'), ('Flexiones de pino', 'pino'),
  ('L-sit', 'l sit'), ('L-sit', 'l-sit hold'),
  ('Burpee', 'burpees'), ('Burpee', 'burpi'), ('Burpee', 'burpis'),
  ('Escaladores', 'mountain climbers'), ('Escaladores', 'escalador'), ('Escaladores', 'alpinistas'),
  ('Thruster', 'thrusters'), ('Thruster', 'sentadilla con press'),
  ('Wall ball', 'wall balls'), ('Wall ball', 'balon a la pared'), ('Wall ball', 'lanzamiento de balon'),
  ('Kettlebell swing', 'kb swing'), ('Kettlebell swing', 'swing'), ('Kettlebell swing', 'balanceo con pesa rusa'), ('Kettlebell swing', 'swing ruso'),
  ('Saltos dobles', 'double unders'), ('Saltos dobles', 'dobles'), ('Saltos dobles', 'du'), ('Saltos dobles', 'doble salto de cuerda'),
  ('Salto al cajón', 'box jump'), ('Salto al cajón', 'box jumps'), ('Salto al cajón', 'salto al banco'),
  ('Cargada de potencia', 'power clean'), ('Cargada de potencia', 'clean'), ('Cargada de potencia', 'cargada'),
  ('Push press', 'empuje de fuerza'), ('Push press', 'press con envion'),
  ('Rodillas al pecho colgado', 'toes to bar'), ('Rodillas al pecho colgado', 't2b'), ('Rodillas al pecho colgado', 'knees to elbows'), ('Rodillas al pecho colgado', 'pies a la barra'),
  ('Arrancada', 'snatch'), ('Arrancada', 'power snatch'), ('Arrancada', 'arranque'),
  ('Remo ergómetro', 'remo erg'), ('Remo ergómetro', 'row'), ('Remo ergómetro', 'rower'), ('Remo ergómetro', 'remoergometro'), ('Remo ergómetro', 'remo cardio'),
  ('Bicicleta de aire', 'assault bike'), ('Bicicleta de aire', 'air bike'), ('Bicicleta de aire', 'echo bike'), ('Bicicleta de aire', 'bici de aire'),
  ('Carrera', 'correr'), ('Carrera', 'run'), ('Carrera', 'running'), ('Carrera', 'trote'),
  ('Ski ergómetro', 'ski erg'), ('Ski ergómetro', 'skierg'), ('Ski ergómetro', 'esqui'),
  ('Empuje de trineo', 'sled push'), ('Empuje de trineo', 'trineo'), ('Empuje de trineo', 'empujar trineo'),
  ('Arrastre de trineo', 'sled pull'), ('Arrastre de trineo', 'jalar trineo'), ('Arrastre de trineo', 'arrastre'),
  ('Burpee con salto largo', 'burpee broad jump'), ('Burpee con salto largo', 'burpee broad jumps'), ('Burpee con salto largo', 'burpee con salto'),
  ('Caminata del granjero', 'farmer carry'), ('Caminata del granjero', 'farmers carry'), ('Caminata del granjero', 'farmers walk'), ('Caminata del granjero', 'caminata de granjero'),
  ('Zancadas con saco', 'sandbag lunges'), ('Zancadas con saco', 'zancadas con sandbag'), ('Zancadas con saco', 'estocadas con saco'),
  ('Azote de balón', 'ball slam'), ('Azote de balón', 'slam ball'), ('Azote de balón', 'ball slams')
) as v(nombre, alias)
join exercises e on e.es_global and e.nombre_canonico = v.nombre;

-- ============================================================
-- 4. Ícono genérico heredado por tipo
-- ============================================================
-- El imagen_url más repetido entre los globales de un tipo ES el ícono
-- genérico (los 5 dibujos a mano son 1 fila cada uno, nunca ganan el conteo).
-- Así los ejercicios nuevos muestran imagen sin hardcodear URLs de bucket acá.
with iconos as (
  select distinct on (tipo) tipo, imagen_url
  from (
    select tipo, imagen_url, count(*) as n
    from exercises
    where es_global and imagen_url is not null
    group by tipo, imagen_url
  ) conteo
  order by tipo, n desc
)
update exercises e
set imagen_url = i.imagen_url
from iconos i
where e.es_global and e.imagen_url is null and e.tipo = i.tipo;
