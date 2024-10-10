function creeHexagone(rayon) {
   var points = new Array();
   for (var i = 0; i < 6; ++i) {
      var angle = i * Math.PI / 3;
      var x = Math.sin(angle) * rayon;
      var y = -Math.cos(angle) * rayon;
      console.log("x="+Math.round(x*100)/100+" y="+Math.round(y*100)/100);
      points.push([Math.round(x*100)/100, Math.round(y*100)/100]);
   }
   return points;
}

function genereDamier(rayon, nbLignes, nbColonnes) {

   var distance =  rayon - (Math.sin(1 * Math.PI / 3) * rayon);  // plus grande distance entre l'hexagone et le cercle circonscrit

   d3.select("#field")
      .append("svg")
      .attr("width", 2*rayon*nbColonnes + rayon*(nbLignes-1) + "px")
      .attr("height", 2*rayon*nbLignes + "px");

   var hexagone = creeHexagone(rayon);
   for (var ligne=0; ligne < nbLignes; ligne++) {
      for (var colonne=0; colonne < nbColonnes; colonne++) {
         var d = "";
         var x, y;
         for (h in hexagone) {
            x = hexagone[h][0]+(rayon-distance)*(2+2*colonne) + (rayon-distance)*ligne;
            y = distance*2 + hexagone[h][1]+(rayon-distance*2)*(1+2*ligne);
            if (h == 0) {
               d += `M${x},${y} `;
            } else {
               d += `L${x},${y} `;
            }
         }
         d += "Z";
         d3.select("svg")
            .append("path")
            .attr("d", d)
            .attr("id", "h"+(ligne*nbLignes+colonne)) // car un id doit commencer par une lettre
            .attr("fill", "#C3DBDB")
            .attr("stroke", "black")
            .on("click", function(d) {
               let selectedID = d3.select(this).attr('id');
               console.log(d3.select(this));
               console.log(selectedID);
               // d3.select(this).attr('fill', 'red');
               
               socket.emit("selectionHexagon", parseInt(selectedID.substring(1)));
            }
         );
      }
   }
}

socket.on("createTable", size => {
   genereDamier(30, size, size);
});