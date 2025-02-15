# socketHexGame

Voici un implémentation du Jeu De Hex ([Wiki](https://en.wikipedia.org/wiki/Hex_(board_game))) en utilisant Socket.io.js et Express.js avec Node.js


## SETUP

Il faut avoir node.js installee sur votre system.
De plus sur node.js il vous faut les packages:
- [express](https://expressjs.com/)
- [socket.io](https://www.npmjs.com/package/socket.io)

Les autres dependance du client comme socket.io.js et d3.js sont importé en utilisant un CDN (il faut donc un **connection a l'internet** pour lancer ce jeu)


## Lancement

Il suffit de se mettre dans le repertoire git du jeu et executer:
```sh 
node ./server_socket.io.js
```
Le jeu est ensuite accessible depuis http://localhost:8888/


## Fonctionnalités Principales

### Construction et affichage du tableau de hexagones

- Utilisation de la squelette initiale
- On dessine également des bordures colorés pour que les joueurs savent quels côtés ils doivent connecter (c'est un peu beaucoup de code additionnelle juste pour ça, mais c'est très utile pour le joueur)
- Quand on hover sur un hexagone vide, il s'éclaircit un peu. Ce n'est pas le cas pour un hexagone placé.

### Entrée / Sortie des joueurs

#### Entrée
- Quand un joueur entre en jeu, il lui est associé une couleur. La couleur est positionnelle, c'est-à- dire, le premier joueur est toujours Teal et le deuxième joueur est toujours Magenta.
- Le pseudo du joueur est ajouté à la liste des joueurs en haut à gauche
- Le jeu ne peut pas commencer tant qu'il n'y a pas 2 joueurs connectés.
- Si un joueur entre en jeu et il y a encore les hexagones du jeu précédent, le tableau est reset automatiquement.
- Un joueur peut entrer seulement si son pseudo passe certaines critères:
  - il n'est pas vide / que du whitespace
  - il fait max 24 caractères
  - il contient pas: >, <, ", '
- Côté serveur, on identifie les joueurs par leurs socket IDs. Cela est utile pour le système des spectateurs et aussi évite quelques moyens de triche (vole d'identité).

#### Sortie
- Quand un joueur quitte le jeu, il est remis dans la liste des spectateurs.
- Quand un joueur J1 quitte la site / refresh, il est automatiquement enlevé du jeu. L'autre joueur J2 reste dans le jeu et si un autre joueur J3 entre dans le jeu, le jeu se reset et les joueurs J2 et J3 peuvent jouer.
- Quand un spectateur quitte la site / refresh, il est enlevé du dictionnaire`spectatorStates` qui sert à la gestion de différents états de jeu que voient les spectateurs.
- Si le joueur sortant était le premier à entrer, la couleur du deuxième joueur change à celle du premier (soit dans le code: sa position passe de 1 à 0). Un message apparaît pour informer le joueur de sa nouvelle couleur.

### Condition de fin du jeu

- Chaque joueur doit connecter leurs deux côtés par une ligne de hexagones
- Le tablier est représenté par un tableau de tableaux. 0 et 1 représentent les hexagones placés par les joueurs. -1 représente un hexagone vide.
- Utilisation d'un algorithme de parcours en profondeur (nommé `dfs()`) à chaque tour d'un joueur.
- Le chemin gagnant clignote quelques fois avant d'afficher un textbox pour rejouer.

### Messagerie

- Réécrite pour utiliser des divs au lieu de juste un seul textarea. Ce qui permet plus de stylisation et de lisibilité.
- Seulement les joueurs peuvent envoyer des messages. Donc les spectateurs ne peuvent pas utiliser le chat.
- Les messages des joueurs sont préparés pour éviter du XSS dans le chat.
- Il y a 4 types de messages:
  - Utilisateur: couleur foncée qui match le thème principale de la page
  - Entrée en jeu: Couleur Teal
  - Sortie de jeu: Couleur Magenta
  - Système: Couleur jaune
- Tous les messages envoyés ne sont pas stockés sur le serveur. Donc si la page est refresh sur un client, les messages sont perdus pour ce client.

### Spectateurs

- Si une personne n'est pas dans le jeu, il est considéré comme un spectateur.
- Il y a 4 boutons de control visibles pour les spectateurs:
  - start: aller au début du jeu
  - back: reculer dans le jeu
  - forward: avancer dans le jeu
  - follow game: suivre le jeu en live (visionnement default)
- Les boutons sont visibles seulement aux spectateurs.
- Il y a un tableau `history` qui contient tous les moves qu'il y a eu dans le jeu courant. Il est donc mis à jour chaque fois que quelqu'un place un hexagone.
- Chaque spectateur peut individuellement regarder un point différent dans le jeu. Ceci est fait avec `spectatorStates`, un dictionnaire de la forme `{socket.id: moveDuJeu}` où `moveDuJeu` est un indice de `history`.
- Si un spectateur ne suit pas le jeu en live, il est mis dans un room socket nommé "timeOut". Son jeu ne sera donc pas mis à jour chaque fois qu'un joueur place un hexagone.
- Si un spectateur continue d'avancer dans le jeu jusqu'a etre au meme move que le jeux live en cours, le spectateur est remis en mode "suite live" du jeux.

## Fonctionnalités additionnelles

- On peut appuyer sur entrée pour joindre le jeu / envoyer un message (pas obligé d'appuyer sur les boutons).
- On ne peut pas tricher en se faisant passer pour un autre joueur, car on vérifie si le socket ID de l'utilisateur qui a cliqué sur un hexagone est bien le socket ID du joueur à qui est le tour.
- On a aussi décidé de stocker la plupart des informations d'importance au côté serveur. Comme la couleur par exemple. Quand un joueur place un hexagone, il dit pas au serveur quelle couleur il est, le serveur le sait déjà.
- On a design un favicon pour le site

<img src="favicon.ico" width="128">

- La taille du grille d'hexagons change dépendant de la taille de la largeur de la fenêtre, pour permettre de jouer au jeu sur un écran plus étroit sans avoir besoin de scroll. On traite seulement la largeur de la fenêtre ici, et pas la hauteur. Donc il faut scroll si l'écran est trop "wide screen"
- Certains boutons apparait et disparait dépendant de votre état:
  - Si vous êtes joueur: Vous ne voyais pas les boutons spectateurs
  - Si vous êtes spectateur: le bouton "new game" à la fin d'un jeu n'apparait pas
  - Le bouton "send" du chat ne disparaît jamais, même si les spectateurs ne peuvent pas utiliser le chat. Mais le bouton est "disabled".
 

## Sources
Title font: [Audiowide](https://fonts.google.com/specimen/Audiowide?preview.text=Hex%20game&categoryFilters=Appearance:%2FTheme%2FTechno&script=Latn)


