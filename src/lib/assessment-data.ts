export const scale = [
  "Pas du tout",
  "Très peu",
  "Peu",
  "Moyennement",
  "Beaucoup",
  "Totalement",
];
export const swotSections = [
  {
    key: "strengths",
    title: "Forces",
    prompt: "Vos atouts personnels, compétences ou ressources.",
  },
  {
    key: "weaknesses",
    title: "Faiblesses",
    prompt: "Les points à renforcer pour faire avancer votre projet.",
  },
  {
    key: "opportunities",
    title: "Opportunités",
    prompt: "Les occasions ou ressources favorables dans votre environnement.",
  },
  {
    key: "threats",
    title: "Menaces",
    prompt: "Les risques ou obstacles externes à anticiper.",
  },
] as const;
export type Swot = Record<(typeof swotSections)[number]["key"], string[]>;
export const emptySwot = (): Swot => ({
  strengths: ["", "", ""],
  weaknesses: ["", "", ""],
  opportunities: ["", "", ""],
  threats: ["", "", ""],
});
export const pillars = [
  {
    id: "Aptitudes",
    count: 16,
    levels: [
      "Novice",
      "Débutant",
      "En apprentissage",
      "En progression",
      "Confirmé",
      "Expérimenté",
    ],
    advice: [
      "Suivre une formation de base en gestion d’entreprise avant de se lancer, avec un accompagnement rapproché.",
      "Suivre une formation pratique en gestion d’entreprise : comptabilité simple, vente, marketing.",
      "Renforcer les savoir-faire les plus faibles par des formations ciblées et la pratique accompagnée.",
      "Cibler les 2 ou 3 savoir-faire les plus faibles et s’exercer avec un appui-conseil.",
      "Consolider par l’expérience et un appui-conseil ponctuel.",
      "Transmettre ses compétences et viser la croissance.",
    ],
  },
  {
    id: "Attitudes",
    count: 18,
    levels: [
      "Attentiste",
      "Passif",
      "Réactif",
      "Volontaire",
      "Proactif",
      "Entreprenant",
    ],
    advice: [
      "Commencer par de très petits défis, avec un accompagnateur, pour prendre confiance.",
      "Se fixer de petits défis concrets pour développer l’initiative et la confiance en soi.",
      "Passer plus souvent à l’action sans attendre que la situation l’impose.",
      "Faire de l’initiative une habitude : un engagement nouveau chaque semaine.",
      "Maintenir l’esprit d’initiative et le diffuser dans l’équipe.",
      "Canaliser l’audace par une analyse systématique des risques.",
    ],
  },
  {
    id: "Motivation",
    count: 12,
    levels: [
      "Distant",
      "Observateur",
      "Curieux",
      "Intéressé",
      "Engagé",
      "Passionné",
    ],
    advice: [
      "Rencontrer des entrepreneurs et explorer d’autres voies en parallèle avant de décider.",
      "Clarifier ses raisons d’entreprendre et rencontrer des entrepreneurs pour confirmer son choix.",
      "Se fixer des objectifs personnels clairs pour renforcer l’engagement.",
      "Relier le projet à ses valeurs et à ses objectifs de vie pour ancrer la motivation.",
      "Entretenir la motivation par des objectifs à court terme et la célébration des réussites.",
      "Canaliser l’énergie vers des objectifs précis et réalistes.",
    ],
  },
  {
    id: "Écosystème",
    count: 10,
    levels: [
      "Très isolé",
      "Isolé",
      "Peu connecté",
      "Connecté",
      "Bien connecté",
      "Écosystème porteur",
    ],
    advice: [
      "Se faire connaître des structures d’accompagnement et rejoindre un premier groupement ou une association.",
      "Construire son réseau : groupements, associations, structures d’accompagnement, institutions de financement.",
      "Élargir son réseau et identifier les structures d’appui de son secteur.",
      "Mobiliser davantage son réseau : demander conseils, mises en relation et appuis.",
      "Entretenir son réseau et l’utiliser pour trouver clients, partenaires et financements.",
      "Exploiter pleinement son environnement et en faire profiter son équipe.",
    ],
  },
];
export const aspects = [
  {
    name: "Idées et opportunités",
    short: "Idées & opportunités",
    definition:
      "La capacité à produire des idées et à repérer, dans son environnement, les besoins et les occasions d’affaires qui peuvent devenir une activité rentable.",
    why: "Une entreprise naît d’un besoin repéré et d’une idée qui y répond.",
    reflection:
      "Quelle est la dernière opportunité que vous avez repérée ? Qu’en avez-vous fait ?",
    items: [
      [
        "J’ai souvent des idées nouvelles de produits, de services ou d’améliorations.",
        "Aptitudes",
      ],
      [
        "Je repère autour de moi des besoins non satisfaits ou des problèmes à résoudre.",
        "Aptitudes",
      ],
      [
        "Avant de me lancer, je vérifie qu’une idée répond à une vraie demande.",
        "Aptitudes",
      ],
      [
        "Dans tout événement, même difficile, je cherche ce que je peux en tirer.",
        "Attitudes",
      ],
      ["Je prends plaisir à imaginer de nouveaux projets.", "Motivation"],
      [
        "J’ai envie de transformer mes idées en activités concrètes.",
        "Motivation",
      ],
      [
        "Mon entourage ou mon réseau me signale des opportunités d’affaires.",
        "Écosystème",
      ],
    ],
  },
  {
    name: "Prise de risque et innovation",
    short: "Prise de risque",
    definition:
      "L’audace d’agir dans l’incertitude en prenant des risques calculés, et l’envie d’essayer de nouvelles façons de faire pour se démarquer.",
    why: "Sans risque calculé, il n’y a ni création ni croissance ; l’innovation permet de se démarquer de la concurrence.",
    reflection:
      "Quel risque avez-vous déjà pris ? Qu’avez-vous appris de son résultat ?",
    items: [
      ["J’accepte de prendre des risques calculés pour avancer.", "Attitudes"],
      [
        "J’ai confiance en moi lorsque je dois agir dans l’incertitude.",
        "Attitudes",
      ],
      [
        "J’aime tester de nouvelles façons de faire, quitte à me tromper.",
        "Attitudes",
      ],
      [
        "J’évalue ce que je peux perdre avant de m’engager et je prévois un plan B.",
        "Aptitudes",
      ],
      [
        "Je suis prêt(e) à investir mon temps et mes économies dans mon projet.",
        "Motivation",
      ],
      [
        "Je connais des sources de financement accessibles : microfinance, banque, fonds d’appui, tontine.",
        "Écosystème",
      ],
      [
        "Dans mon milieu, entreprendre est valorisé et encouragé.",
        "Écosystème",
      ],
    ],
  },
  {
    name: "Résilience et gestion émotionnelle",
    short: "Résilience",
    definition:
      "La capacité à surmonter les échecs, à gérer le stress et à garder le cap malgré les difficultés : rejets de clients, pression financière, critiques.",
    why: "Échecs, rejets et pression financière sont inévitables ; la résilience permet de tenir dans la durée.",
    reflection:
      "Racontez une difficulté que vous avez traversée. Qu’est-ce qui vous a permis de tenir ?",
    items: [
      ["Je sais encaisser les coups durs sans abandonner.", "Attitudes"],
      ["Je garde la maîtrise de mes émotions sous la pression.", "Attitudes"],
      ["Après un échec, j’en tire des leçons et je repars.", "Attitudes"],
      [
        "Je n’ai pas besoin que mon entourage me rassure pour avancer.",
        "Attitudes",
      ],
      ["Je reste tenace jusqu’à atteindre mes objectifs.", "Motivation"],
      [
        "Je reste motivé(e) même quand les résultats tardent à venir.",
        "Motivation",
      ],
      [
        "Je peux compter sur des proches pour me soutenir dans les moments difficiles.",
        "Écosystème",
      ],
    ],
  },
  {
    name: "Leadership et gestion d’équipe",
    short: "Leadership",
    definition:
      "La capacité à inspirer, guider et fédérer une équipe autour d’un projet, à déléguer et à mobiliser les talents.",
    why: "Une entreprise grandit grâce à une équipe motivée et bien dirigée.",
    reflection:
      "Comment motivez-vous les personnes qui travaillent avec vous ? Donnez un exemple.",
    items: [
      [
        "J’aime prendre la tête d’un groupe et en assumer la responsabilité.",
        "Attitudes",
      ],
      [
        "Les autres sollicitent souvent mon avis ou mon arbitrage.",
        "Attitudes",
      ],
      [
        "J’arrive à motiver et à dynamiser les personnes qui m’entourent.",
        "Aptitudes",
      ],
      [
        "Je sais confier des tâches et faire confiance aux autres.",
        "Aptitudes",
      ],
      [
        "J’aime fixer des objectifs et entraîner les autres vers eux.",
        "Motivation",
      ],
      [
        "Je veux créer des emplois et faire grandir les personnes qui travaillent avec moi.",
        "Motivation",
      ],
      [
        "Je sais où trouver des personnes compétentes pour renforcer mon équipe.",
        "Écosystème",
      ],
    ],
  },
  {
    name: "Vision et prise de décision",
    short: "Vision & décision",
    definition:
      "Savoir où l’on veut aller et prendre, au bon moment, des décisions fondées sur les faits et les chiffres.",
    why: "La vision donne la direction ; de bonnes décisions évitent les pertes et permettent de saisir les occasions.",
    reflection:
      "Où voyez-vous votre activité dans cinq ans ? Quelle décision vous en rapproche aujourd’hui ?",
    items: [
      [
        "J’ai une idée claire de ce que je veux réaliser dans les trois à cinq prochaines années.",
        "Motivation",
      ],
      [
        "Je veux bâtir une activité qui dure, pas seulement gagner de l’argent rapidement.",
        "Motivation",
      ],
      ["J’anticipe les événements pour agir au bon moment.", "Aptitudes"],
      [
        "J’utilise les chiffres et les faits pour analyser une situation.",
        "Aptitudes",
      ],
      [
        "Je mesure les conséquences de mes décisions avant d’agir.",
        "Aptitudes",
      ],
      [
        "Je décide rapidement, même quand je n’ai pas toutes les informations.",
        "Attitudes",
      ],
      [
        "J’ai dans mon entourage des entrepreneurs qui m’inspirent ou me conseillent.",
        "Écosystème",
      ],
    ],
  },
  {
    name: "Organisation et méthode de travail",
    short: "Organisation",
    definition:
      "La capacité à structurer son travail, gérer ses priorités et son temps, et suivre ses activités avec rigueur.",
    why: "Une bonne organisation économise le temps et l’argent, et réduit les erreurs.",
    reflection:
      "Comment planifiez-vous votre semaine ? Comment suivez-vous votre argent ?",
    items: [
      ["Je planifie mes activités et je fixe des priorités.", "Aptitudes"],
      [
        "Je tiens un suivi écrit de mes recettes et de mes dépenses.",
        "Aptitudes",
      ],
      ["Je respecte les délais que je me suis fixés.", "Attitudes"],
      [
        "Je travaille avec rigueur et méthode, même quand je suis débordé(e).",
        "Attitudes",
      ],
      ["J’ai une grande capacité de travail, même sur la durée.", "Motivation"],
      [
        "J’ai accès à un accompagnement (incubateur, centre de formation, conseiller) pour m’aider à m’organiser.",
        "Écosystème",
      ],
      [
        "Je dispose des outils de base pour gérer mon activité : cahier de caisse, téléphone, compte bancaire ou mobile money.",
        "Écosystème",
      ],
    ],
  },
  {
    name: "Négociation et influence",
    short: "Négociation",
    definition:
      "L’art de convaincre et d’obtenir des accords gagnant-gagnant avec les clients, fournisseurs, partenaires et financeurs, sans abîmer la relation.",
    why: "Chaque vente, achat ou financement passe par une négociation ; bien négocier protège les marges.",
    reflection:
      "Racontez une négociation réussie et une négociation manquée. Qu’est-ce qui a fait la différence ?",
    items: [
      [
        "Je prépare mes négociations : mon objectif, ma limite et mes arguments.",
        "Aptitudes",
      ],
      [
        "Je sais convaincre un client, un partenaire ou un financeur.",
        "Aptitudes",
      ],
      ["J’obtiens des concessions sans abîmer la relation.", "Aptitudes"],
      [
        "Je reste ferme sur l’essentiel tout en restant ouvert(e) au compromis.",
        "Attitudes",
      ],
      [
        "J’ose défendre le juste prix de mes produits ou services.",
        "Attitudes",
      ],
      ["J’aime conclure des affaires et décrocher des accords.", "Motivation"],
      [
        "J’ai des contacts auprès de fournisseurs, de partenaires ou d’institutions qui peuvent appuyer mon activité.",
        "Écosystème",
      ],
    ],
  },
  {
    name: "Communication et relations interpersonnelles",
    short: "Communication",
    definition:
      "La capacité à écouter, à se faire comprendre, à gérer les désaccords et à bâtir des relations de confiance qui ouvrent des portes.",
    why: "La communication ouvre les portes : clients, partenaires, financeurs et réseau.",
    reflection:
      "Comment adaptez-vous votre message selon que vous parlez à un client, à un fournisseur ou à un financeur ?",
    items: [
      [
        "J’écoute mon interlocuteur jusqu’au bout sans lui couper la parole.",
        "Attitudes",
      ],
      [
        "J’établis facilement le contact avec des personnes que je ne connais pas.",
        "Attitudes",
      ],
      [
        "J’accepte les critiques et les points de vue différents des miens.",
        "Attitudes",
      ],
      [
        "J’adapte ma façon de parler à la personne en face de moi.",
        "Aptitudes",
      ],
      ["Je règle les désaccords par le dialogue.", "Aptitudes"],
      [
        "J’aime aller à la rencontre des clients et des partenaires.",
        "Motivation",
      ],
      [
        "Je fais partie de réseaux, d’associations ou de groupements professionnels.",
        "Écosystème",
      ],
    ],
  },
];
export const globalProfiles = [
  "Potentiel à découvrir",
  "Potentiel à éveiller",
  "Potentiel en construction",
  "Potentiel prometteur",
  "Potentiel affirmé",
  "Potentiel élevé",
];
export const globalReading = [
  "L’entrepreneuriat est encore éloigné du profil actuel. Le découvrir pas à pas, avec un accompagnement rapproché.",
  "Quelques bases existent. Une formation et un accompagnement sont nécessaires avant de se lancer.",
  "Des bases réelles mais encore fragiles. Travailler en priorité les aspects les plus faibles.",
  "Un profil d’entrepreneur qui prend forme. Consolider les points faibles pour gagner en solidité.",
  "Un bon profil d’entrepreneur. Consolider les derniers points faibles et passer à l’étape suivante.",
  "Un profil entrepreneurial très solide. Passer à l’action et viser la croissance.",
];
export const aspectGuides = [
  [
    [
      "Flair à découvrir",
      "Les idées et les occasions d’affaires ne vous viennent pas encore. Votre regard sur les besoins autour de vous est à exercer.",
      "Faites-vous accompagner pour apprendre à observer : notez chaque jour un problème que vous rencontrez ou qu’on vous raconte, et discutez-en avec votre accompagnateur.",
    ],
    [
      "Flair à éveiller",
      "Les idées et les occasions d’affaires vous viennent encore rarement. Cela se travaille par l’observation.",
      "Exercez votre regard : notez chaque semaine trois problèmes que vivent les gens autour de vous. Échangez sur vos idées avec un accompagnateur ou un entrepreneur expérimenté.",
    ],
    [
      "Flair en développement",
      "Vous avez des idées, mais vous les vérifiez ou les exploitez encore peu.",
      "Vérifiez vos idées avant de vous lancer : interrogez au moins dix clients potentiels sur leur besoin réel et sur le prix qu’ils sont prêts à payer.",
    ],
    [
      "Flair prometteur",
      "Vous repérez des idées et des besoins, mais vous ne les transformez pas encore toujours en pistes concrètes.",
      "Pour chaque idée retenue, décrivez en une page le besoin, le client et ce que vous proposez. Testez-la auprès de quelques clients avant d’aller plus loin.",
    ],
    [
      "Bon flair des opportunités",
      "Vous repérez régulièrement des besoins et vous savez en faire des pistes concrètes.",
      "Fréquentez les marchés, les foires et les salons de votre secteur pour repérer ce qui manque. Classez vos idées selon leur potentiel et retenez-en une ou deux.",
    ],
    [
      "Détecteur d’opportunités",
      "Vous voyez des opportunités partout. Votre défi : choisir les meilleures et ne pas vous disperser.",
      "Choisissez vos opportunités avec des critères précis (marché, marge, moyens nécessaires) pour ne pas vous disperser. Partagez votre regard avec votre équipe.",
    ],
  ],
  [
    [
      "Blocage face au risque",
      "Le risque et la nouveauté vous bloquent. Vous évitez d’agir dès qu’il y a une incertitude.",
      "Commencez par des essais sans grand enjeu, avec un accompagnateur. Listez vos peurs et vérifiez avec lui lesquelles sont réalistes.",
    ],
    [
      "Prudence excessive",
      "L’incertitude vous freine. Vous préférez la sécurité, ce qui peut faire passer à côté d’occasions.",
      "Avancez par petits pas : testez une idée avec une petite quantité ou un petit budget. Écrivez ce que vous craignez vraiment et ce qui pourrait arriver de pire.",
    ],
    [
      "Audace hésitante",
      "Vous osez parfois, mais le doute vous retient souvent au moment d’agir.",
      "Pour chaque décision, écrivez la perte maximale acceptable et votre plan B, puis passez à l’action. Renseignez-vous sur les financements adaptés : microfinance, fonds d’appui, tontines, banques.",
    ],
    [
      "Audace modérée",
      "Vous osez agir et tester, mais sans toujours mesurer ce que vous pouvez perdre.",
      "Avant chaque engagement, chiffrez la perte maximale acceptable et prévoyez une solution de repli. Testez à petite échelle avant d’investir davantage.",
    ],
    [
      "Risque calculé",
      "Vous prenez des risques en connaissance de cause et vous testez de nouvelles approches.",
      "Continuez à tester de nouvelles approches à petite échelle. Notez chaque test : objectif, coût, résultat obtenu, décision prise.",
    ],
    [
      "Innovateur audacieux",
      "Vous aimez innover et oser. Gardez l’habitude de mesurer ce que vous pouvez perdre.",
      "Gardez l’habitude de mesurer ce que vous pouvez perdre avant chaque engagement. Entourez-vous de personnes prudentes pour équilibrer vos décisions.",
    ],
  ],
  [
    [
      "Résilience très faible",
      "Les difficultés vous découragent très vite et peuvent vous faire renoncer dès les premiers obstacles.",
      "Ne restez pas seul face aux difficultés : demandez un accompagnement régulier. Après chaque obstacle, notez ce qui s’est passé et ce que vous ferez autrement.",
    ],
    [
      "Résilience faible",
      "Les échecs et la pression vous affectent fortement et peuvent vous pousser à abandonner.",
      "Après chaque difficulté, écrivez trois leçons apprises. Identifiez deux ou trois personnes de confiance à qui parler et n’hésitez pas à demander un accompagnement.",
    ],
    [
      "Résilience modérée",
      "Vous tenez le coup la plupart du temps, mais les coups durs vous déstabilisent encore.",
      "Préparez-vous aux coups durs : épargne de précaution, plan B, personnes ressources. Fixez-vous de petits objectifs pour garder la motivation.",
    ],
    [
      "Résilience en progrès",
      "Vous rebondissez le plus souvent, mais certains échecs vous marquent encore longtemps.",
      "Faites le bilan de vos échecs passés et de ce qu’ils vous ont appris. Gardez une épargne de précaution pour les coups durs.",
    ],
    [
      "Résilience solide",
      "Vous rebondissez après les difficultés et gardez votre calme dans la plupart des situations.",
      "Partagez vos expériences de rebond avec d’autres entrepreneurs. Surveillez les signes de fatigue et protégez votre équilibre.",
    ],
    [
      "Résilience élevée",
      "Vous encaissez et rebondissez avec force. Pensez aussi à préserver votre santé et votre repos.",
      "Protégez votre santé : repos, activité physique, temps en famille. Aidez votre équipe à développer la même solidité face aux difficultés.",
    ],
  ],
  [
    [
      "Leadership à découvrir",
      "Diriger un groupe ou confier des tâches vous met mal à l’aise. Vous préférez travailler seul.",
      "Commencez par travailler en binôme sur une petite tâche et observez comment vous vous répartissez le travail. Participez à la vie d’une association.",
    ],
    [
      "Leadership faible",
      "Vous êtes encore peu à l’aise pour diriger un groupe ou confier des tâches.",
      "Exercez-vous en prenant une petite responsabilité dans une association ou un groupement. Commencez par confier une tâche simple et suivez le résultat.",
    ],
    [
      "Leadership émergent",
      "Vous prenez parfois les commandes, mais déléguer et motiver restent difficiles.",
      "Confiez chaque semaine une tâche entière à un collaborateur et suivez-la sans faire à sa place. Organisez une courte réunion régulière pour partager les objectifs et les résultats.",
    ],
    [
      "Leadership en progrès",
      "Vous savez entraîner les autres, mais déléguer et suivre le travail restent irréguliers.",
      "Fixez des objectifs clairs à chaque collaborateur et faites le point chaque semaine. Déléguez une tâche entière et résistez à l’envie de la reprendre.",
    ],
    [
      "Leader affirmé",
      "Vous savez entraîner les autres et leur faire confiance.",
      "Reconnaissez et valorisez les réussites de l’équipe. Associez vos collaborateurs aux décisions qui les concernent.",
    ],
    [
      "Leader fédérateur",
      "Les autres vous suivent naturellement. Veillez à faire grandir les leaders autour de vous.",
      "Faites grandir les leaders autour de vous : formez un adjoint et déléguez des décisions. Transmettez votre expérience à d’autres entrepreneurs.",
    ],
  ],
  [
    [
      "Vision absente",
      "Vous n’avez pas encore d’idée précise de ce que vous voulez construire, et vous décidez surtout au jour le jour.",
      "Réfléchissez avec un accompagnateur à ce que vous voulez réaliser et pourquoi. Notez vos ventes et vos dépenses chaque semaine pour décider sur des faits.",
    ],
    [
      "Vision floue",
      "Votre direction est encore floue et les décisions se prennent au jour le jour.",
      "Écrivez en une phrase ce que vous voulez réaliser dans cinq ans. Commencez à noter vos chiffres de base : ventes et dépenses.",
    ],
    [
      "Vision en construction",
      "Vous avez une idée de votre direction, mais vos décisions manquent encore d’analyse ou de rapidité.",
      "Traduisez votre vision en trois objectifs chiffrés. Avant une décision importante, listez les options, leurs coûts et leurs conséquences.",
    ],
    [
      "Vision qui se précise",
      "Votre direction se précise et vous vous appuyez sur des faits, mais pas encore de façon régulière.",
      "Faites chaque mois le point sur vos chiffres (ventes, dépenses, marge) avant de décider. Comparez vos résultats à vos objectifs.",
    ],
    [
      "Vision claire",
      "Vous savez où vous allez et vous décidez en vous appuyant sur les faits.",
      "Construisez un plan d’affaires sur trois ans et ajustez vos décisions à partir de vos indicateurs.",
    ],
    [
      "Stratège",
      "Vous anticipez et décidez avec assurance. Partagez votre vision pour qu’elle porte toute l’équipe.",
      "Partagez votre vision avec votre équipe et vos partenaires. Élaborez un plan stratégique et suivez ses indicateurs.",
    ],
  ],
  [
    [
      "Organisation absente",
      "Vous travaillez au jour le jour, sans planification ni suivi écrit de votre activité et de votre argent.",
      "Commencez par un seul outil : un cahier de caisse où vous notez chaque jour les entrées et sorties d’argent. Séparez l’argent de l’entreprise de celui de la famille.",
    ],
    [
      "Organisation limitée",
      "Vous travaillez beaucoup dans l’urgence, avec peu de planification et de suivi écrit.",
      "Tenez votre cahier de caisse chaque jour et séparez l’argent de l’entreprise de celui de la famille. Chaque lundi, notez vos trois priorités de la semaine.",
    ],
    [
      "Organisation moyenne",
      "Vous vous organisez par moments, mais la méthode n’est pas encore une habitude.",
      "Chaque lundi, fixez vos trois priorités de la semaine. Utilisez un agenda ou un carnet pour suivre vos tâches et vos délais.",
    ],
    [
      "Organisation en progrès",
      "Vous avez des méthodes et un suivi, mais vous ne les appliquez pas encore toujours.",
      "Faites de vos méthodes une habitude : un moment fixe chaque semaine pour planifier et mettre à jour vos comptes. Utilisez un tableau de suivi simple.",
    ],
    [
      "Bonne organisation",
      "Vous planifiez, suivez vos activités et respectez la plupart de vos délais.",
      "Formalisez vos méthodes : fiches de tâches, tableaux de suivi, procédures simples. Déléguez les tâches secondaires pour vous concentrer sur l’essentiel.",
    ],
    [
      "Organisation rigoureuse",
      "Votre rigueur est un atout. Gardez de la souplesse pour saisir l’imprévu.",
      "Gardez de la souplesse pour saisir l’imprévu. Transmettez vos outils d’organisation à votre équipe.",
    ],
  ],
  [
    [
      "Négociation évitée",
      "Vous évitez de négocier et acceptez le plus souvent les conditions des autres.",
      "Calculez votre coût de revient avec un accompagnateur pour savoir quel prix vous ne devez jamais accepter. Entraînez-vous à négocier lors de jeux de rôle.",
    ],
    [
      "Négociateur en difficulté",
      "Vous cédez facilement ou évitez de négocier, au détriment de vos marges.",
      "Calculez votre coût de revient pour connaître le prix en dessous duquel vous perdez de l’argent. Préparez par écrit vos arguments avant de rencontrer un client.",
    ],
    [
      "Négociateur hésitant",
      "Vous négociez, mais souvent sans préparation ni argumentaire solide.",
      "Avant chaque négociation, fixez votre objectif, votre limite et trois arguments. Entraînez-vous à présenter votre activité en deux minutes.",
    ],
    [
      "Négociateur en progrès",
      "Vous préparez certaines négociations, mais vous cédez encore trop vite sur le prix.",
      "Avant chaque négociation, préparez des contreparties (délais, quantités, services) plutôt que de baisser le prix.",
    ],
    [
      "Bon négociateur",
      "Vous préparez vos négociations et obtenez des accords équilibrés.",
      "Analysez vos négociations passées pour repérer ce qui marche. Construisez des accords gagnant-gagnant durables avec vos clients et fournisseurs.",
    ],
    [
      "Négociateur stratégique",
      "Vous convainquez et concluez avec aisance. Transmettez vos méthodes à votre équipe.",
      "Formez votre équipe à vos méthodes de négociation. Développez des partenariats durables avec les fournisseurs et les financeurs.",
    ],
  ],
  [
    [
      "Communication difficile",
      "Aller vers les autres, vous exprimer ou écouter vous coûte beaucoup ; vous évitez souvent les échanges.",
      "Exercez-vous dans un cadre rassurant : présentez votre activité à des proches, puis lors d’une réunion de groupement. Écoutez sans interrompre et reformulez.",
    ],
    [
      "Communication à renforcer",
      "Écouter, vous exprimer ou aller vers les autres vous demande encore beaucoup d’efforts.",
      "Pratiquez l’écoute : laissez l’autre finir et reformulez ce qu’il a dit avant de répondre. Allez chaque semaine à la rencontre d’une nouvelle personne de votre secteur.",
    ],
    [
      "Communication correcte",
      "Vous communiquez correctement, mais l’écoute ou la gestion des désaccords peuvent progresser.",
      "Adaptez votre message à chaque interlocuteur : client, fournisseur, financeur. Réglez les désaccords en tête-à-tête, par le dialogue.",
    ],
    [
      "Communication en progrès",
      "Vous communiquez bien dans la plupart des situations, mais les désaccords ou les inconnus vous mettent encore en difficulté.",
      "Préparez vos échanges difficiles : les faits, votre ressenti, votre proposition. Participez à au moins un événement professionnel par mois.",
    ],
    [
      "Bon communicant",
      "Vous écoutez, vous vous adaptez et vous entretenez de bonnes relations.",
      "Rejoignez une association professionnelle ou un groupement et participez aux rencontres. Demandez régulièrement l’avis de vos clients.",
    ],
    [
      "Communicant influent",
      "Vous créez facilement la confiance. Mettez ce talent au service de votre réseau d’affaires.",
      "Mettez votre aisance relationnelle au service de votre réseau d’affaires : présentez des partenaires, prenez la parole lors des événements.",
    ],
  ],
];
