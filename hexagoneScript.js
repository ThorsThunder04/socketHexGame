const RAYON = 30;
const DISTANCE = RAYON - (Math.sin(1 * Math.PI / 3) * RAYON);  // plus grande distance entre l'hexagon et le cercle circonscrit

function creeHexagon() {
   var points = new Array();
   for (var i = 0; i < 6; ++i) {
      var angle = i * Math.PI / 3;
      var x = Math.sin(angle) * RAYON;
      var y = -Math.cos(angle) * RAYON;
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
 * Places shapes in svg using D3 
 * 
 * ## Params 
 * @param {String} d: values for the svg path
 * @param {String} color: fill color for the hexagon/shape
 * @returns Returns the d3 element for more manipulations if desired
 */
function placeShape(d, color) {
   let elt = d3.select("svg")
            .append("path")
            .attr("d", d)
            .attr("fill", color)
            .attr("stroke", "black");
   return elt;
}


function genereDamier(nbLignes, nbColonnes, colors) {

   d3.select("#field")
      .append("svg")
      .attr("width", 2*RAYON*nbColonnes + RAYON*(nbLignes-1) + 2*RAYON + "px")
      .attr("height", 2*RAYON*nbLignes + 2*RAYON + "px");

   var hexagon = creeHexagon();
   // index guide: 0: top, 1: right, 2:bottom, 3:left
   let borderLinePoints = [[],[],[],[]];
   for (var ligne=0; ligne < nbLignes; ligne++) {
      for (var colonne=0; colonne < nbColonnes; colonne++) {

         d = "";
         for (h in hexagon) {
            h = parseInt(h); // because for some dumb reason, h is not an integer..
            x = hexagon[h][0]+(RAYON-DISTANCE)*(2+2*colonne) + (RAYON-DISTANCE)*ligne + RAYON;
            y = DISTANCE*2 + hexagon[h][1]+(RAYON-DISTANCE*2)*(1+2*ligne) + RAYON;
            if (h == 0) {
               d += `M${x},${y} `;
            } else {
               d += `L${x},${y} `;
            }
            
            // depending on which index of the hexagon corner point we are on, and which hexagon we are on in the table
            // we log these points to an array of arrays that contain points to colour in each border line 
            //* can be refactored with modulo 6, though it may become less understandable 
            if (ligne == 0) {
               if ([5,0,1].includes(h)) borderLinePoints[0].push([x,y]); // top of hexagon
            }
            if (colonne == nbColonnes-1) {
               if ([0,1,2].includes(h)) borderLinePoints[1].push([x,y]); // right of hexagon
            }
            if (ligne == nbLignes-1) {
               if ([2,3,4].includes(h)) borderLinePoints[2].push([x,y]); // bottom of hexagon
            }
            if (colonne == 0) {
               if ([3,4,5].includes(h)) borderLinePoints[3].push([x,y]); // left of hexagon 
            }
         }
         d += "Z";

         placeShape(d, INIT_COLOR_HEX)
            .attr("id", "h"+(ligne*nbLignes+colonne))
            //.attr("class", "hexagons")
            .on("click", function(d) {
               let selectedID = d3.select(this).attr('id');
               
               socket.emit("selectionHexagon", parseInt(selectedID.substring(1)));
            }
         );
      }
   }
   // because of how the loop goes over the points of a hexagon (starts at top and goes clockwise)
   borderLinePoints[0].sort((a,b) => a[0]-b[0]); // sort by x
   borderLinePoints[2].sort((a,b) => a[0]-b[0]);
   borderLinePoints[3].sort((a,b) => a[1]-b[1]); // sort by y

   // draw the coloured borders
   for (let b in borderLinePoints) { // for each border

      for (let i = 0; i < borderLinePoints[b].length-1; i++) { // get cordinates of point[x] and point[x+1]
         let [ x1, y1 ] = borderLinePoints[b][i];
         let [ x2, y2 ] = borderLinePoints[b][i+1];

         // make d string represending a line between point[x] and point[x+1]
         d = `M${x1},${y1} L${x2},${y2} Z`;
         placeShape(d, "transparent").attr("stroke", colors[b%2]).attr("stroke-width", "3");
      }
   }
}

socket.on("createTable", data => {
   let { size, colors} = data;
   genereDamier(size, size, colors);
   COLORS = colors; // sets the global variable in scriptClient.js to colors
   // console.log(creeHexagon(10));
});