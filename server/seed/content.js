// Contenido de demostración: 3 lecturas y 3 retos de pensamiento crítico.
// Todo lo de este archivo se guarda con is_demo = true y se muestra marcado como
// "Demostración" en la interfaz. No representa resultados de estudiantes reales.

export const readings = [
  {
    slug: 'fuga-de-agua',
    title: 'La fuga de agua del colegio San Martín',
    grade: 4,
    difficulty: 'Básica',
    topic: 'Medio ambiente',
    body: `En el colegio San Martín, los baños del patio tenían una fuga. Los estudiantes escuchaban un «pssss» detrás de la pared, pero nadie sabía de dónde salía. El señor Bruno, el conserje, colocó un balde debajo del tubo. Al final de la mañana el balde estaba lleno: se habían juntado 12 litros de agua.

En la reunión de familias, la directora mostró la factura del agua. En marzo el colegio pagó 80 soles y en mayo, 120 soles. «El agua es barata, no pasa nada», dijo un papá desde el fondo del aula. Ana, una estudiante de cuarto grado, levantó la mano: en su casa el agua se corta dos veces por semana y su mamá llena baldes para cocinar.

La directora llamó a un gasfitero. Él revisó las tuberías y encontró dos tubos rotos. Arreglarlos cuesta 300 soles. Ahora la directora tiene un problema: con ese dinero puede arreglar los tubos o comprar los libros nuevos de la biblioteca.`,
    realLifePrompt:
      'En tu casa o en tu colegio, ¿dónde se podría estar perdiendo agua? Propón dos acciones concretas para evitarlo y explica cuál harías primero.',
    questions: [
      {
        level: 'literal',
        type: 'multiple',
        skill: 'comprension',
        prompt: '¿Cuántos litros de agua se juntaron en el balde durante la mañana?',
        options: ['3 litros', '12 litros', '80 litros', '120 litros'],
        correctIndex: 1,
        guidance:
          'El texto dice que al final de la mañana el balde estaba lleno: se habían juntado 12 litros de agua.',
      },
      {
        level: 'literal',
        type: 'open',
        skill: 'comprension',
        prompt: '¿Qué dos problemas del colegio San Martín menciona el texto?',
        guidance:
          'Se espera que nombre la fuga de agua en los baños y el aumento del pago del agua (de 80 a 120 soles). También es válido mencionar que el barrio se queda sin agua. Se acepta cualquier respuesta que identifique dos problemas reales del relato.',
      },
      {
        level: 'inferencial',
        type: 'multiple',
        skill: 'analisis',
        prompt: '¿Por qué aumentó el pago del agua en el colegio?',
        options: [
          'Porque los estudiantes usaron más agua en los baños.',
          'Porque los tubos rotos gastaban agua sin que nadie la usara.',
          'Porque el gasfitero cobró 300 soles.',
          'Porque el agua se corta dos veces por semana en el barrio.',
        ],
        correctIndex: 1,
        guidance:
          'El texto no dice que se usara más agua, sino que se perdía por los tubos rotos. El gasto del gasfitero y los cortes del barrio son datos distintos.',
      },
      {
        level: 'inferencial',
        type: 'open',
        skill: 'evidencias',
        prompt:
          '¿Qué crees que pasará si no se arreglan los tubos? Apóyate en una pista del texto.',
        guidance:
          'Se valora que anticipe una consecuencia (la factura seguirá subiendo, se perderá más agua) y que la sostenga con un dato: los 12 litros en una mañana o el paso de 80 a 120 soles.',
      },
      {
        level: 'critica',
        type: 'multiple',
        skill: 'analisis',
        prompt: '¿Cuál de estas afirmaciones del texto es una opinión?',
        options: [
          'En mayo el colegio pagó 120 soles.',
          'Se juntaron 12 litros de agua en una mañana.',
          'El agua es barata, no pasa nada.',
          'El gasfitero encontró dos tubos rotos.',
        ],
        correctIndex: 2,
        guidance:
          '«El agua es barata, no pasa nada» expresa una valoración personal. Los otros tres son datos que se pueden comprobar.',
      },
      {
        level: 'critica',
        type: 'open',
        skill: 'argumentacion',
        prompt:
          'La directora tiene 300 soles. ¿Qué debería hacer: arreglar los tubos o comprar los libros nuevos? Justifica con dos razones del texto.',
        guidance:
          'Hay varias respuestas válidas. Se valora que elija una opción, que use datos (300 soles, 120 soles de factura, 12 litros por mañana) y que reconozca lo que se pierde con la otra opción.',
      },
    ],
  },
  {
    slug: 'celular-recreo',
    title: 'El celular en el recreo: ¿distracción o herramienta?',
    grade: 6,
    difficulty: 'Intermedia',
    topic: 'Tecnología y convivencia',
    body: `El colegio Nuevo Horizonte encuestó a sus 240 estudiantes. El 65 % respondió que usa el celular durante el recreo, sobre todo para escuchar música o ver videos. El 40 % de quienes lo usan dijo que alguna vez se quedó sin jugar con sus amigos porque estaba mirando la pantalla. Además, tres docentes notaron que algunos estudiantes llegan tarde a clase después del recreo.

El profesor de Matemática propone prohibir el celular en todo el colegio. Dice que en su clase hay menos distracciones cuando los celulares no están a la vista. La señora Pilar, del quiosco, cuenta que algunos estudiantes le piden su celular para llamar a su mamá si se sienten mal.

El consejo estudiantil propone otra idea: crear «zonas de uso» durante el recreo. Una banca del patio sería el lugar donde se puede usar el celular y el resto del patio quedaría libre de pantallas. También sugieren que los docentes expliquen cuánto tiempo pasan en pantalla y para qué.

La directora quiere decidir antes de fin de mes. Pidió que cada propuesta incluya datos que la respalden y que escuche a todos los grupos: estudiantes, docentes, familias y personal del quiosco.`,
    realLifePrompt:
      'Piensa en un momento del día en que el celular te quita tiempo de algo importante para ti. Propón una regla personal o familiar, y explica cómo comprobarías si funciona.',
    questions: [
      {
        level: 'literal',
        type: 'multiple',
        skill: 'comprension',
        prompt: '¿A cuántos estudiantes se encuestó?',
        options: ['120 estudiantes', '240 estudiantes', '65 estudiantes', '40 estudiantes'],
        correctIndex: 1,
        guidance:
          'El texto dice que el colegio encuestó a sus 240 estudiantes. El 65 % y el 40 % son porcentajes de esa encuesta.',
      },
      {
        level: 'literal',
        type: 'open',
        skill: 'comprension',
        prompt: '¿Qué dos propuestas aparecen en el texto?',
        guidance:
          'Se espera: prohibir el celular en todo el colegio (propuesta del profesor de Matemática) y crear zonas de uso durante el recreo (propuesta del consejo estudiantil).',
      },
      {
        level: 'inferencial',
        type: 'multiple',
        skill: 'analisis',
        prompt: '¿Por qué se menciona a la señora Pilar en el texto?',
        options: [
          'Para mostrar que el celular también puede servir en una emergencia.',
          'Para explicar cuánto gana el quiosco en el recreo.',
          'Para decir que ella usa el celular mientras vende.',
          'Para demostrar que la directora ya decidió prohibirlo.',
        ],
        correctIndex: 0,
        guidance:
          'La señora Pilar cuenta que algunos estudiantes usan su celular para avisar a su familia si se sienten mal. Es un argumento a favor de un uso regulado, no de una prohibición total.',
      },
      {
        level: 'inferencial',
        type: 'open',
        skill: 'evidencias',
        prompt:
          'El 40 % dijo que se quedó sin jugar con sus amigos por mirar la pantalla. ¿Qué relación tiene ese dato con la propuesta del consejo estudiantil?',
        guidance:
          'Se valora que relacione el dato con la idea de limitar el uso a una zona: si el problema es aislarse, una zona de uso permite usar el celular sin dejar de compartir el patio. No hay una única respuesta correcta.',
      },
      {
        level: 'critica',
        type: 'multiple',
        skill: 'analisis',
        prompt: '¿Cuál de estas afirmaciones del texto es una opinión?',
        options: [
          'El colegio encuestó a 240 estudiantes.',
          'El 65 % usa el celular durante el recreo.',
          'Prohibir el celular es la única solución posible.',
          'El consejo estudiantil propone crear zonas de uso.',
        ],
        correctIndex: 2,
        guidance:
          '«La única solución posible» es una valoración que no se puede comprobar: es una opinión. Los otros enunciados son datos del texto.',
      },
      {
        level: 'critica',
        type: 'open',
        skill: 'argumentacion',
        prompt:
          '¿Cuál de las dos propuestas apoyarías? Justifica con dos datos del texto y explica qué grupo podría quedar afectado.',
        guidance:
          'Hay varias respuestas válidas. Se valora que use dos datos (65 %, 40 %, 240 estudiantes, tres docentes, el caso de la señora Pilar) y que reconozca a los afectados: estudiantes que necesitan llamar, docentes con distracciones o el personal del quiosco.',
      },
    ],
  },
  {
    slug: 'kiosco-escolar',
    title: '¿Quién decide lo que comemos en el recreo?',
    grade: 8,
    difficulty: 'Avanzada',
    topic: 'Ciudadanía y salud',
    body: `En el kiosco del colegio República se venden galletas, gaseosas y sándwiches. Un grupo de estudiantes revisó los precios: una gaseosa cuesta 3 soles y una fruta, 2 soles. Durante el recreo, en diez minutos, se vendieron 45 gaseosas y 6 frutas.

La nutricionista del centro de salud explicó que un vaso de gaseosa puede tener hasta 12 cucharaditas de azúcar y recomendó no vender bebidas azucaradas en las escuelas. La señora Elena, dueña del kiosco desde hace nueve años, dice que si deja de vender gaseosas perderá casi la mitad de sus ingresos y que con eso paga el colegio de su hija.

Un estudiante con diabetes cuenta que durante años no tuvo una opción sin azúcar en el kiosco. Otros estudiantes dicen que la fruta es más cara para lo que reciben y que a veces no alcanza el tiempo para pelarla.

La dirección propone tres medidas: (1) prohibir las gaseosas; (2) mantenerlas, subir su precio y ofrecer agua gratis; (3) dejar que cada estudiante decida y hacer una campaña de información. Cada medida tiene defensores y críticos. Antes de votar, el consejo escolar acordó escuchar los datos de ventas, la opinión de la señora Elena, la recomendación de la nutricionista y la voz de los estudiantes.`,
    realLifePrompt:
      'Revisa en casa la etiqueta de un producto que consumes seguido. Anota cuánta azúcar tiene y propón un cambio posible para tu familia, con una forma de saber si funcionó.',
    questions: [
      {
        level: 'literal',
        type: 'multiple',
        skill: 'comprension',
        prompt: '¿Cuántas gaseosas y cuántas frutas se vendieron en diez minutos?',
        options: [
          '45 gaseosas y 6 frutas',
          '6 gaseosas y 45 frutas',
          '12 gaseosas y 3 frutas',
          '3 gaseosas y 2 frutas',
        ],
        correctIndex: 0,
        guidance:
          'El texto indica que en diez minutos se vendieron 45 gaseosas y 6 frutas. Los otros números corresponden al azúcar y a los precios.',
      },
      {
        level: 'literal',
        type: 'open',
        skill: 'comprension',
        prompt: '¿Cuáles son las tres medidas que propone la dirección?',
        guidance:
          'Se espera: (1) prohibir las gaseosas; (2) mantenerlas con un precio mayor y ofrecer agua gratis; (3) dejar la decisión a cada estudiante con una campaña de información.',
      },
      {
        level: 'inferencial',
        type: 'multiple',
        skill: 'analisis',
        prompt: '¿Por qué el texto menciona los ingresos de la señora Elena?',
        options: [
          'Para mostrar que vender gaseosas le quita dinero.',
          'Para mostrar que la decisión también afecta el trabajo y la vida de una persona.',
          'Para explicar cuánto cuesta una gaseosa en el colegio.',
          'Para decir que la fruta es más barata que la gaseosa.',
        ],
        correctIndex: 1,
        guidance:
          'El dato de sus ingresos introduce un punto de vista económico y humano: la medida afecta a la señora Elena y a su familia. No se afirma que pierda dinero.',
      },
      {
        level: 'inferencial',
        type: 'open',
        skill: 'evidencias',
        prompt:
          '¿Qué información falta en el texto para tomar una buena decisión? Menciona un dato que no aparece.',
        guidance:
          'Se aceptan varios datos: cuánto cuesta ofrecer agua gratis, cuánto ganaría el kiosco con fruta, cuántos estudiantes comprarían opciones saludables, cuántos estudiantes tienen diabetes, qué opina el resto de las familias.',
      },
      {
        level: 'critica',
        type: 'multiple',
        skill: 'analisis',
        prompt: '¿Cuál de estas afirmaciones del texto es un hecho verificable?',
        options: [
          'Las gaseosas deberían prohibirse en todos los colegios.',
          'La fruta es la mejor opción para el recreo.',
          'En diez minutos se vendieron 45 gaseosas.',
          'La señora Elena es una persona generosa.',
        ],
        correctIndex: 2,
        guidance:
          'La cantidad de gaseosas vendidas se puede comprobar con el registro de ventas. Las otras afirmaciones expresan opiniones o valores.',
      },
      {
        level: 'critica',
        type: 'open',
        skill: 'argumentacion',
        prompt:
          'Elige una de las tres medidas y evalúala: ¿qué argumento la sostiene, qué evidencia la respalda y qué riesgo tiene? Propón un ajuste para reducir ese riesgo.',
        guidance:
          'Hay varias respuestas válidas. Se valora que elija una medida, la apoye con evidencia del texto (45 gaseosas, 12 cucharaditas, 6 frutas, los ingresos de la señora Elena, el estudiante con diabetes), nombre un riesgo real y proponga un ajuste concreto.',
      },
    ],
  },
];

export const problems = [
  {
    slug: 'fila-quiosco',
    title: 'La fila del quiosco',
    grade: 4,
    topic: 'Convivencia escolar',
    scenario: `En el recreo del colegio Los Álamos, la fila del quiosco es larguísima. El recreo dura 25 minutos y cerca de 150 estudiantes quieren comprar algo. La señora Rosa atiende sola y demora unos 6 segundos con cada pedido sencillo.

Algunos estudiantes empujan para llegar primero; otros se cansan y se van sin comprar. Tres estudiantes llegaron tarde a clase porque estaban en la fila.`,
    question: '¿Cómo podrían reducir el tiempo de espera en el quiosco sin dejar a nadie sin comprar?',
    context:
      'Piensa en ideas que se puedan hacer con lo que ya existe en el colegio. No hay dinero extra para contratar a otra persona.',
    identify: {
      prompt: '¿Cuál es el problema principal del relato?',
      options: [
        'Que la comida del quiosco no es saludable.',
        'Que la espera es muy larga y causa empujones y tardanzas.',
        'Que el recreo dura solo 25 minutos.',
        'Que la señora Rosa trabaja sola.',
      ],
      correctIndex: 1,
      guidance:
        'El problema central es la espera y sus efectos (empujones, tardanzas). Que la señora Rosa trabaje sola es una causa del problema, no el problema en sí.',
    },
    factOpinions: [
      {
        text: 'El recreo dura 25 minutos.',
        isFact: true,
        explanation: 'Es un dato del relato que se puede comprobar.',
      },
      {
        text: 'La señora Rosa atiende el quiosco sola.',
        isFact: true,
        explanation: 'Es un hecho que aparece en la situación.',
      },
      {
        text: 'La comida del quiosco es la más rica del colegio.',
        isFact: false,
        explanation: 'Es una opinión: depende de los gustos de cada persona.',
      },
      {
        text: 'Es injusto que los estudiantes pierdan clase por hacer cola.',
        isFact: false,
        explanation: 'Es una opinión: expresa un valor sobre lo que es justo.',
      },
    ],
    openSteps: [
      {
        key: 'alternativas',
        label: 'Alternativas de solución',
        skill: 'soluciones',
        prompt:
          'Propón al menos dos alternativas distintas para reducir la espera. Pueden ser ideas simples y de bajo costo.',
        guidance:
          'Se esperan dos o más alternativas viables: abrir una segunda caja con apoyo de una familia, preparar combos listos, organizar turnos por grado, tomar pedidos antes del recreo o poner un carrito en otro patio.',
      },
      {
        key: 'justificacion',
        label: 'Justifica con evidencias',
        skill: 'evidencias',
        prompt:
          'Elige tu mejor alternativa y justifica con al menos un dato del problema (los 25 minutos, los 150 estudiantes, los 6 segundos o los tres estudiantes que llegaron tarde).',
        guidance:
          'Se valora que cite un dato concreto y lo relacione con la mejora esperada, por ejemplo: «si hay una segunda caja, el tiempo de espera se reduce a la mitad».',
      },
      {
        key: 'reflexion',
        label: 'Revisa y mejora tu solución',
        skill: 'argumentacion',
        prompt: '¿Qué podría salir mal con tu propuesta? ¿Cómo la mejorarías?',
        guidance:
          'Se valora que reconozca un riesgo real (más personas atendiendo en el mismo espacio, pedidos equivocados) y que proponga un ajuste concreto.',
      },
    ],
    rubricHint:
      'Hay varias soluciones válidas. Valora la variedad de alternativas, el uso de datos del relato y la reflexión sobre riesgos.',
  },
  {
    slug: 'bus-tardanza',
    title: 'El bus que nunca llega a tiempo',
    grade: 6,
    topic: 'Vida escolar',
    scenario: `El bus escolar de la ruta 3 recoge a 38 estudiantes. La ruta empieza a las 6:20 a. m. y debería llegar al colegio a las 7:10 a. m., pero en las últimas tres semanas llegó entre 7:25 y 7:40. Los estudiantes pierden la primera hora de clases.

La empresa dice que el tráfico aumentó por unas obras en la avenida principal. Una madre grabó con su celular que el bus espera hasta 8 minutos en una esquina donde no sube nadie. Otro padre opina que «los choferes no tienen interés en llegar temprano».`,
    question:
      '¿Qué debería cambiar la empresa para que el bus llegue a tiempo, sin aumentar mucho el costo del servicio?',
    context:
      'En el bus viajan estudiantes de primaria y secundaria. Las familias no pueden llevar a sus hijos por su cuenta.',
    identify: {
      prompt: '¿Qué información es más útil para entender las tardanzas?',
      options: [
        'La opinión de un padre sobre los choferes.',
        'Los horarios de llegada de las últimas tres semanas y las paradas de la ruta.',
        'El número total de estudiantes del colegio.',
        'El nombre de la avenida donde hay obras.',
      ],
      correctIndex: 1,
      guidance:
        'Los horarios registrados y las paradas permiten ver dónde se pierde tiempo. La opinión del padre no se puede comprobar con datos.',
    },
    factOpinions: [
      {
        text: 'El bus debería llegar al colegio a las 7:10 a. m.',
        isFact: true,
        explanation: 'Es el horario establecido en la ruta: un dato comprobable.',
      },
      {
        text: 'En las últimas tres semanas el bus llegó entre 7:25 y 7:40.',
        isFact: true,
        explanation: 'Es un registro de llegadas que se puede verificar.',
      },
      {
        text: 'Los choferes no tienen interés en llegar temprano.',
        isFact: false,
        explanation: 'Es una opinión que atribuye intenciones sin evidencia.',
      },
      {
        text: 'El tráfico por las obras es la única causa de las tardanzas.',
        isFact: false,
        explanation:
          'Es una opinión: afirma una causa única sin revisar otras como las esperas innecesarias.',
      },
    ],
    openSteps: [
      {
        key: 'alternativas',
        label: 'Alternativas de solución',
        skill: 'soluciones',
        prompt:
          'Propón dos alternativas para cumplir el horario. Considera a los estudiantes, a los choferes y a las familias.',
        guidance:
          'Se esperan dos o más ideas viables: eliminar la parada donde no sube nadie, adelantar 10 minutos la salida, cambiar parte de la ruta, coordinar con la empresa un registro de horarios.',
      },
      {
        key: 'justificacion',
        label: 'Justifica con evidencias',
        skill: 'evidencias',
        prompt:
          'Justifica tu propuesta con datos del relato y explica cómo atiende a los tres grupos (estudiantes, choferes y familias).',
        guidance:
          'Se valora que use los datos (38 estudiantes, 6:20, 7:10, 7:25-7:40, 8 minutos de espera) y que muestre el efecto para cada grupo.',
      },
      {
        key: 'reflexion',
        label: 'Revisa y mejora tu solución',
        skill: 'argumentacion',
        prompt:
          '¿Qué evidencia necesitarías para comprobar que tu propuesta funciona? ¿Cómo la recogerías?',
        guidance:
          'Se valora un indicador claro (minutos de llegada, número de pasajeros por parada) y un modo realista de recogerlo (registro del chofer, encuesta a familias).',
      },
    ],
    rubricHint:
      'Se valora distinguir causas comprobables de suposiciones y proponer mejoras con indicadores de seguimiento.',
  },
  {
    slug: 'presupuesto-aula',
    title: 'Los 500 soles del aula',
    grade: 8,
    topic: 'Participación y decisiones',
    scenario: `El aula de 3.º B ganó 500 soles en un concurso de proyectos. Hay tres pedidos: (a) 20 libros para la biblioteca del aula, por 450 soles; (b) dos ventiladores, porque en verano el calor es fuerte, por 500 soles; (c) una salida al museo para 30 estudiantes, por 480 soles.

En una encuesta, 18 estudiantes votaron por la salida, 9 por los ventiladores y 3 por los libros. Sin embargo, la mitad del aula no respondió la encuesta. La profesora recuerda que el aula se usa también en el turno de la tarde, cuando hace más calor, y que los libros podrían compartirse con otra sección. Una estudiante opina que «ir al museo es lo único que de verdad vale la pena».`,
    question: '¿Cómo debería decidir el aula en qué usar los 500 soles?',
    context:
      'El dinero se puede usar en una sola cosa o combinarse. Las decisiones deben poder explicarse a todo el aula, incluidos quienes no respondieron la encuesta.',
    identify: {
      prompt: '¿Qué dato del relato cambia más la decisión?',
      options: [
        'Que el aula ganó un concurso de proyectos.',
        'Que la mitad del aula no respondió la encuesta.',
        'Que la salida al museo cuesta 480 soles.',
        'Que una estudiante prefiere ir al museo.',
      ],
      correctIndex: 1,
      guidance:
        'Una encuesta con la mitad de respuestas no representa a todo el aula. Sin ese dato, la votación parecería una decisión legítima de la mayoría.',
    },
    factOpinions: [
      {
        text: 'El aula ganó 500 soles en un concurso.',
        isFact: true,
        explanation: 'Es un dato verificable del relato.',
      },
      {
        text: 'En la encuesta, 18 estudiantes votaron por la salida.',
        isFact: true,
        explanation: 'Es un resultado registrado de la encuesta.',
      },
      {
        text: 'Ir al museo es lo único que de verdad vale la pena.',
        isFact: false,
        explanation: 'Es una opinión: expresa una preferencia personal.',
      },
      {
        text: 'El calor del verano es un problema más importante que la biblioteca.',
        isFact: false,
        explanation: 'Es una opinión que compara dos necesidades según un criterio personal.',
      },
    ],
    openSteps: [
      {
        key: 'alternativas',
        label: 'Alternativas de solución',
        skill: 'soluciones',
        prompt:
          'Propón dos formas distintas de usar el dinero. Puedes combinar opciones o buscar acuerdos entre los grupos.',
        guidance:
          'Se esperan dos alternativas viables: combinar una salida más económica con libros, buscar una donación para los ventiladores, repetir la encuesta con todo el aula y luego decidir, dividir el monto.',
      },
      {
        key: 'justificacion',
        label: 'Justifica con evidencias',
        skill: 'evidencias',
        prompt:
          'Justifica tu propuesta con al menos dos datos y explica a quién beneficia y a quién perjudica.',
        guidance:
          'Se valora el uso de datos (500, 450, 480, 18, 9, 3, la mitad del aula sin responder) y el reconocimiento explícito de los grupos afectados.',
      },
      {
        key: 'reflexion',
        label: 'Revisa y mejora tu solución',
        skill: 'argumentacion',
        prompt:
          '¿Cómo sabrías, al terminar el año, si la decisión fue buena? Propón dos señales que se puedan observar.',
        guidance:
          'Se valora que proponga indicadores concretos: uso real de los libros, estudiantes que se concentran mejor con ventiladores, aprendizaje de la salida, satisfacción del aula.',
      },
    ],
    rubricHint:
      'Hay varias soluciones válidas. Se valora reconocer la limitación de la encuesta, justificar con datos y proponer cómo evaluar la decisión.',
  },
];

export const demoPassword = 'demo1234';

export const demoAccounts = [
  { role: 'docente', name: 'Carla Rojas', email: 'docente@demo.com', label: 'Docente' },
  { role: 'estudiante', name: 'Diego Ramos', email: 'estudiante@demo.com', label: 'Estudiante' },
  { role: 'familia', name: 'Rocío Ramos', email: 'familia@demo.com', label: 'Familia' },
];

export const demoClassrooms = [
  { name: '4.º A', grade: 4 },
  { name: '6.º A', grade: 6 },
  { name: '8.º A', grade: 8 },
];

export const demoStudents = [
  { name: 'Ana Quispe', email: 'ana.quispe@demo.com', grade: 4, classroom: '4.º A' },
  { name: 'Diego Ramos', email: 'estudiante@demo.com', grade: 4, classroom: '4.º A' },
  { name: 'Lucía Vega', email: 'lucia.vega@demo.com', grade: 6, classroom: '6.º A' },
  { name: 'Mateo Silva', email: 'mateo.silva@demo.com', grade: 6, classroom: '6.º A' },
  { name: 'Sofía Cano', email: 'sofia.cano@demo.com', grade: 8, classroom: '8.º A' },
];

export const demoGuardians = [
  { name: 'Rocío Ramos', email: 'familia@demo.com', children: ['estudiante@demo.com'] },
  { name: 'Hugo Vega', email: 'hugo.vega@demo.com', children: ['lucia.vega@demo.com'] },
];
