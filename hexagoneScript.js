function creeHexagone(rayon) {
   var points = new Array();
   for (var i = 0; i < 6; ++i) {
      var angle = i * Math.PI / 3;
      var x = Math.sin(angle) * rayon;
      var y = -Math.cos(angle) * rayon;
      //console.log("x="+Math.round(x*100)/100+" y="+Math.round(y*100)/100);
      points.push([Math.round(x*100)/100, Math.round(y*100)/100]);
   }
   return points;
}

function calcMidPoint(pt1, pt2) {
      let [ x1, y1 ] = pt1;
      let [ x2, y2 ] = pt2;
      return [(x1+x2)/2, (y1+y2)/2];
}

/** 
 * ## Description
 * Used for making filtering coordinates for semi-hexagonal edges that will
 * be used to indicate to the players which edges they have to connect to win
 * 
 * [Reference Image](https://upload.wikimedia.org/wikipedia/commons/3/38/Hex-board-11x11-(2).jpg)
 * 
 * ## Paramaters 
 * @param {Number} edgeNum: 0: Top, 1: Right, 2: Botton, 3: Left
 * @param {Number[][]} hexagoneList: relative X,Y coords for hexagone of a certain radius (calculated with `creeHexagone(radiux)`)
 * @returns {Number[][]} filtered hexagoneList for given edge
 */
function edgeHexagone(edgeNum, hexagonList) {

   // clones the array, so that we aren't modifying the same object
   hexL = Array.from(hexagoneList); 

   // TODO (thor): see if can be changed to math formulas with edgeNum (instead of 4 switch cases)
   switch (edgeNum) {
      case 0: // Top
         hexL[1] = calcMidPoint(hexL[1], hexL[2]);
         hexL[5] = calcMidPoint(hexL[4], hexL[5]);
         hexL.splice(0,1);
         break;
      case 1: // Right
         hexL[0] = calcMidPoint(hexL[0], hexL[5]);
         hexL[2] = calcMidPoint(hexL[2], hexL[3]);
         hexL.splice(1,1);
         break;
      case 2: // Bottom
         hexL[2] = calcMidPoint(hexL[1], hexL[2]);
         hexL[4] = calcMidPoint(hexL[4], hexL[5]);
         hexL.splice(3,1);
         break;
      case 3: // Left
         hexL[3] = calcMidPoint(hexL[2], hexL[3]);
         hexL[5] = calcMidPoint(hexL[5], hexL[0]);
   }
   return hexL;
}

/**
 * ## Description
 * Places shapes in svg using D3 
 * 
 * ## Params 
 * @param {String} d: values for the svg path
 * @param {String} color: fill color for the hexagon/shape
 * @param {String|null} id: if not null, adds an id to th path element
 * @returns Returns the d3 element for more manipulations if desired
 */
function placeShape(d, color, id) {
   let elt = d3.select("svg")
            .append("path")
            .attr("d", d)
            .attr("fill", color)
            .attr("stroke", "black");
   if (id != null) {
      elt = elt.attr("id", id)
   }
   return elt;
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

         placeShape(d, "#C3DBDB", "h"+(ligne*nbLignes+colonne))
            .on("click", function(d) {
               let selectedID = d3.select(this).attr('id');
               //console.log(d3.select(this));
               //console.log(selectedID);
               // d3.select(this).attr('fill', 'red');
               
               socket.emit("selectionHexagon", parseInt(selectedID.substring(1)));
            }
         );
         
      }
   }
}

socket.on("createTable", data => {
   let { size, colors} = data;
   genereDamier(30, size, size);
   // console.log(creeHexagone(10));
});