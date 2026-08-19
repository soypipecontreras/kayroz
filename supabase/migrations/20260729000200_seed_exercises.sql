-- Seed de ejercicios comunes (es_global = true, user_id = null) con
-- instrucciones breves y alias regionales (México, Argentina, España,
-- Colombia). imagen_url se deja NULL: ver instrucciones de carga en la
-- respuesta del asistente / README del proyecto.

insert into exercises (nombre_canonico, grupo_muscular, tipo, instrucciones, es_global) values
-- Pecho
('Press banca', 'pecho', 'barra', 'Acostado en el banco, baja la barra controlada hasta rozar el pecho y empuja hasta extender los brazos sin rebotar.', true),
('Press banca inclinado', 'pecho', 'barra', 'Con el banco a 30-45°, baja la barra hacia la parte alta del pecho y empuja en línea recta hacia arriba.', true),
('Press banca con mancuernas', 'pecho', 'mancuerna', 'Baja las mancuernas a los lados del pecho controladas y empuja hasta juntar las manos arriba sin chocar los codos.', true),
('Press inclinado con mancuernas', 'pecho', 'mancuerna', 'Con el banco inclinado, baja las mancuernas hacia la parte alta del pecho y empuja hacia arriba sin arquear la espalda.', true),
('Aperturas con mancuernas', 'pecho', 'mancuerna', 'Con los codos ligeramente flexionados, abre los brazos en arco hasta sentir el estiramiento en el pecho y vuelve a juntarlos arriba.', true),
('Contractor', 'pecho', 'maquina', 'Junta los codos o las manos al frente en un arco controlado, sin usar impulso.', true),
('Fondos en paralelas', 'pecho', 'peso_corporal', 'Baja el cuerpo flexionando los codos e inclínate ligeramente al frente para enfatizar pecho, luego empuja hasta extender los brazos.', true),
('Press de pecho en máquina', 'pecho', 'maquina', 'Empuja las manijas al frente hasta extender los brazos y vuelve controlado sin bloquear los codos con fuerza.', true),

-- Espalda
('Dominadas', 'espalda', 'peso_corporal', 'Cuelga de la barra con agarre prono y sube hasta que la barbilla pase la barra, bajando controlado hasta brazos extendidos.', true),
('Jalón al pecho', 'espalda', 'cable', 'Jala la barra hacia la parte alta del pecho llevando los codos hacia abajo y atrás, sin usar impulso del torso.', true),
('Remo con barra', 'espalda', 'barra', 'Con el torso inclinado al frente y la espalda recta, jala la barra hacia el abdomen apretando los omóplatos.', true),
('Remo con mancuerna', 'espalda', 'mancuerna', 'Apoyado en un banco con una rodilla, jala la mancuerna hacia la cadera llevando el codo hacia atrás.', true),
('Remo sentado en polea', 'espalda', 'cable', 'Sentado con las rodillas ligeramente flexionadas, jala el agarre hacia el abdomen manteniendo la espalda recta.', true),
('Peso muerto', 'espalda', 'barra', 'Con la barra pegada a las piernas, levanta manteniendo la espalda neutra y empujando el piso con los talones hasta quedar de pie.', true),
('Remo en máquina', 'espalda', 'maquina', 'Jala las manijas hacia el torso apretando la espalda, controlando el regreso sin dejar caer el peso.', true),

-- Hombro
('Press militar', 'hombro', 'barra', 'De pie o sentado, empuja la barra desde los hombros hasta extender los brazos arriba de la cabeza sin arquear la espalda en exceso.', true),
('Press militar con mancuernas', 'hombro', 'mancuerna', 'Empuja las mancuernas desde la altura de los hombros hasta extender los brazos arriba, controlando el descenso.', true),
('Elevaciones laterales', 'hombro', 'mancuerna', 'Con los brazos casi extendidos, sube las mancuernas a los lados hasta la altura de los hombros sin usar impulso.', true),
('Elevaciones frontales', 'hombro', 'mancuerna', 'Sube la mancuerna o barra al frente hasta la altura de los hombros con el brazo casi extendido, controlando el descenso.', true),
('Pájaros', 'hombro', 'mancuerna', 'Inclinado al frente, abre los brazos con las mancuernas hacia los lados enfocando la parte posterior del hombro.', true),
('Press Arnold', 'hombro', 'mancuerna', 'Empieza con las palmas hacia ti a la altura de los hombros y rota mientras empujas arriba hasta extender los brazos.', true),

-- Bíceps
('Curl con barra', 'biceps', 'barra', 'Con los codos pegados al torso, sube la barra flexionando los antebrazos sin balancear el cuerpo.', true),
('Curl con mancuernas', 'biceps', 'mancuerna', 'Flexiona los codos subiendo las mancuernas sin mover los hombros ni balancear el torso.', true),
('Curl martillo', 'biceps', 'mancuerna', 'Sube las mancuernas con agarre neutro (palmas enfrentadas) manteniendo los codos fijos al costado.', true),
('Curl en polea', 'biceps', 'cable', 'Con el cable abajo, flexiona los codos llevando el agarre hacia los hombros sin mover el torso.', true),
('Curl predicador', 'biceps', 'barra', 'Con los brazos apoyados en el banco predicador, flexiona hasta arriba y controla el descenso sin extender del todo de golpe.', true),

-- Tríceps
('Press francés', 'triceps', 'barra', 'Acostado o sentado, baja la barra hacia la frente flexionando solo los codos y extiende de vuelta arriba.', true),
('Extensión de tríceps en polea', 'triceps', 'cable', 'Con los codos fijos al costado, empuja la cuerda o barra hacia abajo hasta extender los brazos.', true),
('Fondos en banco', 'triceps', 'peso_corporal', 'Apoya las manos en el borde del banco y baja el cuerpo flexionando los codos hacia atrás, luego empuja hasta extender los brazos.', true),
('Patada de tríceps', 'triceps', 'mancuerna', 'Con el torso inclinado y el brazo pegado al costado, extiende el codo hacia atrás hasta estirar el tríceps.', true),

-- Pierna
('Sentadilla', 'pierna', 'barra', 'Con la barra en la espalda alta, baja las caderas hacia atrás y abajo manteniendo el pecho arriba, hasta al menos 90° de rodilla.', true),
('Prensa de pierna', 'pierna', 'maquina', 'Empuja la plataforma extendiendo las piernas sin bloquear del todo las rodillas, controlando el regreso.', true),
('Zancadas', 'pierna', 'mancuerna', 'Da un paso al frente y baja hasta que ambas rodillas formen 90°, luego empuja de vuelta a la posición inicial.', true),
('Peso muerto rumano', 'pierna', 'barra', 'Con las rodillas casi extendidas, baja la barra pegada a las piernas empujando la cadera hacia atrás hasta sentir el estiramiento en isquiotibiales.', true),
('Extensión de cuádriceps', 'pierna', 'maquina', 'Sentado en la máquina, extiende las piernas hasta casi estirar del todo y controla el regreso.', true),
('Curl femoral', 'pierna', 'maquina', 'Acostado o sentado en la máquina, flexiona las rodillas llevando el peso hacia los glúteos de forma controlada.', true),
('Elevación de talones', 'pierna', 'maquina', 'Sube los talones lo más alto posible y baja controlado hasta sentir el estiramiento en la pantorrilla.', true),

-- Glúteo
('Hip thrust', 'gluteo', 'barra', 'Con la espalda apoyada en el banco y la barra sobre la cadera, empuja las caderas hacia arriba apretando los glúteos arriba.', true),
('Puente de glúteo', 'gluteo', 'peso_corporal', 'Acostado boca arriba con las rodillas flexionadas, empuja las caderas hacia arriba apretando los glúteos.', true),
('Patada de glúteo en polea', 'gluteo', 'cable', 'Con el cable en el tobillo, empuja la pierna hacia atrás y arriba apretando el glúteo, sin arquear la espalda.', true),

-- Core
('Plancha', 'core', 'peso_corporal', 'Apoya antebrazos y puntas de los pies, mantén el cuerpo en línea recta apretando abdomen y glúteos.', true),
('Abdominales', 'core', 'peso_corporal', 'Acostado con rodillas flexionadas, sube el torso contrayendo el abdomen sin jalar el cuello con las manos.', true),
('Elevación de piernas colgado', 'core', 'peso_corporal', 'Colgado de la barra, sube las piernas o rodillas hacia el pecho controlando el balanceo.', true),

-- Cardio
('Caminadora', 'cardio', 'maquina', 'Camina o trota a un ritmo constante ajustando velocidad e inclinación según el objetivo.', true),
('Bicicleta estática', 'cardio', 'maquina', 'Pedalea a un ritmo constante ajustando la resistencia según el objetivo.', true);

-- Alias regionales / coloquiales, para que el parser normalice a un mismo exercise_id
insert into exercise_aliases (alias, exercise_id)
select v.alias, e.id
from (values
  ('Press banca', 'banca'), ('Press banca', 'press plano'), ('Press banca', 'bench'), ('Press banca', 'bench press'), ('Press banca', 'press de banca'),
  ('Press banca inclinado', 'inclinado'), ('Press banca inclinado', 'press inclinado'), ('Press banca inclinado', 'incline press'), ('Press banca inclinado', 'banca inclinada'),
  ('Press banca con mancuernas', 'press banca mancuernas'), ('Press banca con mancuernas', 'press plano mancuernas'), ('Press banca con mancuernas', 'dumbbell press'),
  ('Press inclinado con mancuernas', 'press inclinado mancuernas'), ('Press inclinado con mancuernas', 'inclinado mancuernas'),
  ('Aperturas con mancuernas', 'aperturas'), ('Aperturas con mancuernas', 'flyes'), ('Aperturas con mancuernas', 'vuelos'), ('Aperturas con mancuernas', 'cristo'),
  ('Contractor', 'pec deck'), ('Contractor', 'contractor pecho'), ('Contractor', 'mariposa'),
  ('Fondos en paralelas', 'fondos'), ('Fondos en paralelas', 'paralelas'), ('Fondos en paralelas', 'dips'),
  ('Press de pecho en máquina', 'press pecho maquina'), ('Press de pecho en máquina', 'maquina de pecho'),

  ('Dominadas', 'pull ups'), ('Dominadas', 'pullups'), ('Dominadas', 'chin ups'), ('Dominadas', 'jalones en barra'),
  ('Jalón al pecho', 'jalon'), ('Jalón al pecho', 'lat pulldown'), ('Jalón al pecho', 'polea al pecho'), ('Jalón al pecho', 'jalon al frente'),
  ('Remo con barra', 'remo barra'), ('Remo con barra', 'barbell row'),
  ('Remo con mancuerna', 'remo mancuerna'), ('Remo con mancuerna', 'remo a una mano'), ('Remo con mancuerna', 'dumbbell row'),
  ('Remo sentado en polea', 'remo polea'), ('Remo sentado en polea', 'remo sentado'), ('Remo sentado en polea', 'seated row'),
  ('Peso muerto', 'deadlift'), ('Peso muerto', 'muerto'), ('Peso muerto', 'peso muerto convencional'),
  ('Remo en máquina', 'remo maquina'),

  ('Press militar', 'militar'), ('Press militar', 'overhead press'), ('Press militar', 'press hombro barra'), ('Press militar', 'press de hombros'),
  ('Press militar con mancuernas', 'press militar mancuernas'), ('Press militar con mancuernas', 'press hombro mancuernas'),
  ('Elevaciones laterales', 'laterales'), ('Elevaciones laterales', 'elevaciones laterales mancuernas'), ('Elevaciones laterales', 'lateral raises'),
  ('Elevaciones frontales', 'frontales'), ('Elevaciones frontales', 'front raises'),
  ('Pájaros', 'pajaros'), ('Pájaros', 'posteriores'), ('Pájaros', 'rear delt'), ('Pájaros', 'vuelos posteriores'),
  ('Press Arnold', 'arnold press'), ('Press Arnold', 'press arnold mancuernas'),

  ('Curl con barra', 'curl barra'), ('Curl con barra', 'curl biceps barra'), ('Curl con barra', 'barbell curl'),
  ('Curl con mancuernas', 'curl mancuernas'), ('Curl con mancuernas', 'curl biceps'), ('Curl con mancuernas', 'dumbbell curl'),
  ('Curl martillo', 'martillo'), ('Curl martillo', 'hammer curl'),
  ('Curl en polea', 'curl polea'), ('Curl en polea', 'cable curl'),
  ('Curl predicador', 'predicador'), ('Curl predicador', 'preacher curl'), ('Curl predicador', 'banco scott'), ('Curl predicador', 'scott'),

  ('Press francés', 'frances'), ('Press francés', 'skull crusher'), ('Press francés', 'extension frances'),
  ('Extensión de tríceps en polea', 'triceps polea'), ('Extensión de tríceps en polea', 'extension triceps'), ('Extensión de tríceps en polea', 'pushdown'), ('Extensión de tríceps en polea', 'jalon triceps'),
  ('Fondos en banco', 'fondos banco'), ('Fondos en banco', 'bench dips'), ('Fondos en banco', 'fondos triceps'),
  ('Patada de tríceps', 'patada triceps'), ('Patada de tríceps', 'kickback'),

  ('Sentadilla', 'sentadillas'), ('Sentadilla', 'squat'), ('Sentadilla', 'cuclillas'),
  ('Prensa de pierna', 'prensa'), ('Prensa de pierna', 'leg press'),
  ('Zancadas', 'estocadas'), ('Zancadas', 'lunges'), ('Zancadas', 'zancada'),
  ('Peso muerto rumano', 'rumano'), ('Peso muerto rumano', 'romanian deadlift'), ('Peso muerto rumano', 'rdl'), ('Peso muerto rumano', 'muerto rumano'),
  ('Extensión de cuádriceps', 'extension cuadriceps'), ('Extensión de cuádriceps', 'leg extension'), ('Extensión de cuádriceps', 'extensiones'),
  ('Curl femoral', 'leg curl'), ('Curl femoral', 'femoral'), ('Curl femoral', 'curl femoral maquina'),
  ('Elevación de talones', 'gemelos'), ('Elevación de talones', 'elevacion talones'), ('Elevación de talones', 'calf raise'), ('Elevación de talones', 'pantorrillas'),

  ('Hip thrust', 'hip thrust barra'), ('Hip thrust', 'empuje de cadera'),
  ('Puente de glúteo', 'puente gluteo'), ('Puente de glúteo', 'glute bridge'),
  ('Patada de glúteo en polea', 'patada gluteo'), ('Patada de glúteo en polea', 'gluteo polea'), ('Patada de glúteo en polea', 'cable kickback gluteo'),

  ('Plancha', 'plank'), ('Plancha', 'plancha abdominal'),
  ('Abdominales', 'crunch'), ('Abdominales', 'crunches'),
  ('Elevación de piernas colgado', 'elevacion piernas'), ('Elevación de piernas colgado', 'leg raises'), ('Elevación de piernas colgado', 'elevacion rodillas colgado'),

  ('Caminadora', 'cinta'), ('Caminadora', 'trotadora'), ('Caminadora', 'treadmill'), ('Caminadora', 'banda caminadora'),
  ('Bicicleta estática', 'bici estatica'), ('Bicicleta estática', 'spinning'), ('Bicicleta estática', 'bicicleta fija')
) as v(nombre_canonico, alias)
join exercises e on e.nombre_canonico = v.nombre_canonico and e.es_global;
