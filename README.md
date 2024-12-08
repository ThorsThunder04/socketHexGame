# socketHexGame

## Fonctionalités Principales

### Construction et affichage du tableau de hexagones

- Utilisation de la squelette initiale
- On dessine aussi des bordures colorés pour que les joueurs savent quels cotés ils doivent connecter (c'est un peut beaucoup de code additionelle juste pour ça)

### Entrée / Sortie des joueurs

#### Entrée
- Quand un joueur entre en jeu, il lui est associé une couleur. La couleur est positionelle, c'est a dire, le premier jouer est toujours Teal et le deuxième joueur est toujours Magenta.
- Le pseudo du joueur est ajouté à la liste des joueurs en haut à gauche
- Le jeu ne peut pas commencer tant qu'il n'y a pas 2 joueurs connectés.
- Si un joueur entre en jeu et il y a encore les hexagones du jeu precedent, le tableau est reset automatiquement.
- Un joueur peut entrer seulement si son pseudo passe certaines criteres: 
  - il n'est pas vide / que du whitespace
  - il fait max 24 characteres
  - il contient pas: >, <, ", '
- Coté serveur, on identifie les joueurs par leurs socket IDs. Cela est utile pour le système des spectateurs et aussi evite quelques moyens de triche (vole d'identité).

#### Sortie
- Quand un joueur quitte le jeu, il est remis dans la liste des spectateurs.
- Quand un joueur J1 quitte la site / refresh, il est automatiquement enlever du jeu. L'autre joueur J2 reste dans le jeu et si un autre joueur J3 entre dans le jeu, le jeu se reset et les joueurs J2 et J3 peuvent jouer.
- Quand un spectateur quitte la site / refresh, il est enlever de la liste `spectatorStates` qui sert pour la gestion de différents états de jeu que voient les spectateurs.
- Si le joueur sortant était le premier à entrer, la couleur du deuxième joueur change à celle du premier (soit dans le code: son position passe de 1 a 0). Un message apparait pour informer le joueur de sa nouvelle couleur.

### Condition de fin du jeu

- Chaque joueur doit connecter leurs deux cotés par une ligne de hexagones
- Le tableau est representé par un tableau de tableaux. 0 et 1 representent les hexagones placés par les joueurs. -1 represente un hexagone vide.
- Utilisation d'un algorithme de parcours en profondeur (nommé `dfs()`) à chaque tour d'un joueur.
- Le chemain gagnant clignote quelques fois avant d'afficher un textbox pour rejouer.

### Messagerie

- Re-écrit pour utiliser des divs au lieu de juste un seul textarea. Ce qui permet plus de stylisation et lisibilité.
- Seulement les joueurs peuvent envoyer des messages. Donc les spectateurs ne peuvent pas utiliser le chat.
- Les messages des joueurs sont preparés pour eviter du XSS dans le chat.
- Il y a 4 types de messages:
  - Utilisateur: couleur foncée qui match le thème principale de la page
  - Entrée en jeu: Couleur Teal
  - Sortie de jeu: Couleur Magenta
  - Système: Couleur jaune

### Spectateurs

- Si une personne n'est pas dans le jeu, il est consideré comme un spectateur.
- Il y a 4 bouttons de control visibles pour les spectateurs:
  - start: aller au debut du jeu
  - back: reculer dans le jeu 
  - forward: avancer dans le jeu
  - follow game: suivre le jeu en live (visionnement default)
- Les bouttons sont visibles seulement aux spectateurs.
- Il y a un tableau `history` qui contient tous les moves qu'il y a eu dans le jeu courant. Il est donc mis à jour chaque fois que quelqu'un place un hexagone.
- Chaque spectateur peut individuellement regarder un point différent dans jeu. Ceci est fait avec `spectatorStates`, un dictionaire de la forme `{socket.id: moveDuJeu}` où `moveDuJeu` est un indice de `history`.
- Si un spectateur ne suit pas le jeu en live, il est mis dans un room socket nommé "timeOut". Son jeu sera donc pas mis à jour chaque fois qu'un joueur place un hexagone.

## Fonctionalités additionelles

- On peut appuyer sur entrer pour join le jeu / envoyer un message (pas obliger d'appuyer sur les bouttons).
- On ne peut pas tricher en impersonnant l'autre joueur, car on verifie si le socket ID de l'utilisateur qui a cliqué sur un hexagone est bien le socket ID du joueur à qui est le tour.


## Sources
Title font: [Audiowide](https://fonts.google.com/specimen/Audiowide?preview.text=Hex%20game&categoryFilters=Appearance:%2FTheme%2FTechno&script=Latn)