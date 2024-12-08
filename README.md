# socketHexGame

## Fonctionalites Principale

### Construction et affichage du Taleau de hexagons

- Utilisation du squelete initial
- On dessine aussi des bordures colorés pour que les joueurs savent quels cotés ils doivent connecter (c'est un peut beaucoup de code additionelle just pour ça)

### Entree Sortie des joueurs

#### Entree
- Quand un joueur entre en jeux, il est associé un couleur. La couleur est positionelle, c'est a dire, le premier jouer est toujours Teal et la deuxieme joueur est toujours Magenta.
- Le pseudo du joueur est ajouté a la liste des joueurs en haut a gauche
- Le jeux ne peut pas commencer tant qu'il n'y a pas 2 joueurs connecté.
- Si un joueur entre en jeux et il y a encore les hexagons du jeux precedent, le tableau est reset automatiquement.
- Un joueur peut entre seulement si son pseudo passe certaines criteres: 
  - il n'est pas vide / que du whitespace
  - il fait max 24 characteres
  - il contient pas: >, <, ", '
- Coté serveur, on identifie les joueurs par leur socket ID. Cela est utile pour le system des spectateurs et aussi evite quelques moyens de tricher (vole d'identité).

#### Sortie
- Quand un joueur se deconnecte, il est remis dans la liste des spectateurs.
- Si le joueur sortant etait le premier a entrer, la couleur du deuxieme joueur change a celle du premier (soit dans le code: son position passe de 1 a 0). Un message apparait pour informer le joueur de son nouveau couleur

### Condition de fin du jeu

- Chaque joueur doit connecter leurs deux cotés par un ligne de hexagons
- Le tableau est representé par un tableau de tableaux. 0 et 1 represent les hexagons placé par les joueurs. -1 reprensente un hexagone vide.
- Utilisation d'un algorithme de parcours en profondeur (nommé `dfs()`) a chaque tour d'un joueur
- Le chemain gagnant clignote quelques fois avant d'affcher un textbox pour rejouer

### Messagerie

- Re-ecrit pour utiliser des divs au lieu de juste un seul textarea. Ce qui permet plus de stylisation et lisibilité.
- Seulement les joueurs peuvent envoyer des messages. Donc les spectateurs ne peuvent pas utiliser le chat.
- Les messages des joueurs sont preparé pour eviter du XSS dans le chat.
- Il y a 4 types de messages:
  - Utilisateur: couleur foncé qui match le theme principale du page
  - Entree en jeux: Couleur Teal
  - Sortie de jeux: Couleur Magenta
  - System: Couleur jaune

### Spectateurs

- Si un person n'est pas dans le jeu, il est consideré comme un spectateur
- Il y a 4 bouttons de control visible pour les spectateurs:
  - start: aller au debut du jeu
  - back: reculer dans le jeu 
  - forward: avancer dans le jeu
  - follow game: suivre le jeu en live (visionnement default)
- Les bouttons sont visible a seulement les spectateurs
- Il y a un tableau `history` qui contient tout les moves qu'il y a eu dans le jeu courant. Il est donc mis a jour a chaque fois que quelqu'un place un hexagon.
- Chaque spectateur peut individuellement regarder un point different dans jeu. Ceci est fait avec `spectatorStates`, un dictionaire de la form `{socket.id: moveDuJeu}` ou `moveDuJeu` est un indice de `history`.
- Si un spectateur ne suite pas le jeu en live, il est mis dans un room socket nommé "timeOut". Son jeu sera donc pas mis a jour a chaque fois qu'un joueur place un hexagone

## Fonctionalites additionelles

- On peut appuier sur entrer pour join le jeux / envoyer un message (pas obliger d'appuier sur les bouttons)
- On ne peut pas tricher en impersonnant l'autre joueur. Car on verifie si le socket ID du utilisateur qui a clické sur un hexagon est bien le socket ID du joueur au quel c'est a son tour de jouer.


## Souces
Title font: [Audiowide](https://fonts.google.com/specimen/Audiowide?preview.text=Hex%20game&categoryFilters=Appearance:%2FTheme%2FTechno&script=Latn)