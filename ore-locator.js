// TODO:
// better handle "multiple deposits" case


import {Ceres} from 'https://cdn.jsdelivr.net/gh/Pterodactylus/Ceres.js@master/Ceres-v1.4.13.js'

var planets = null;
var Planet = null;
var PositionRegexp = new RegExp(/[\-0-9\.]+/g);
var Radius = 1;
var Positions = [null, null, null, null, null];
var Distances = [0, 0, 0, 0, 0];

function Mean(...args){
	var acc = 0;
	args.forEach(function(arg){acc += arg;});
	return acc / args.length;
}

function DegreesToRadians(degrees){
	return degrees * (Math.PI/180);
}

function RadiansToDegrees(radians){
	return radians * (180/Math.PI);
}

function Distance3D(posA, posB){
	return Math.sqrt(Math.pow(posA[0] - posB[0], 2) + Math.pow(posA[1] - posB[1], 2) + Math.pow(posA[2] - posB[2], 2));
}

function Length3D(xyz){
	return Distance3D([0, 0, 0], xyz);
}

function RotateNode3DonX(node, theta) {
	var y = node[1];
	var z = node[2];
	
	var cosTheta = Math.cos(DegreesToRadians(theta));
	var sinTheta = Math.sin(DegreesToRadians(theta));
	
	node[1] = y * cosTheta - z * sinTheta;
	node[2] = y * sinTheta + z * cosTheta;
}

function RotateNode3DonY(node, theta) {
	var x = node[0];
	var z = node[2];
	
	var cosTheta = Math.cos(DegreesToRadians(theta));
	var sinTheta = Math.sin(DegreesToRadians(theta));
	
	node[0] = x * cosTheta - z * sinTheta;
	node[2] = x * sinTheta + z * cosTheta;
}

function RotateNode3DonZ(node, theta) {
	var x = node[0];
	var y = node[1];
	
	var cosTheta = Math.cos(DegreesToRadians(theta));
	var sinTheta = Math.sin(DegreesToRadians(theta));
	
	node[0] = x * cosTheta - y * sinTheta;
	node[1] = x * sinTheta + y * cosTheta;
}

function ParsePosition(pos) {
	// ::pos{0,	2, 18.5558, 85.0548, 278.9962}
	pos = pos.trim().replaceAll(" ", "").replaceAll("\t", "");
	if (!pos.startsWith("::pos{") || !pos.endsWith("}")){
		throw "Invalid position prefix/suffix: " + pos;
	}
	var match = pos.match(PositionRegexp);
	if (match == null || match.length != 5){
		throw "Invalid position format: " + pos;
	}
	
	return {q: match[0], p: match[1], lng: parseFloat(match[2]), lat: parseFloat(match[3]), h: parseFloat(match[4])};
}

function PositionToXYZ(pos){
	var vec = [0, Radius + pos.h, 0];
	RotateNode3DonX(vec, pos.lng);
	RotateNode3DonZ(vec, pos.lat);
	return vec;
}

function XYZtoPosition(xyz){
	var height = Length3D(xyz);
	var lat = RadiansToDegrees(Math.acos(xyz[0] / Math.sqrt(xyz[0]*xyz[0] + xyz[1]*xyz[1]))) - 90;
	var lng = 90 - RadiansToDegrees(Math.acos(xyz[2] / height));
	return {lng: lng, lat: lat, h: height - Radius};
}

function PositionToString(pos){
	return "::pos{0, 2, " + pos.lng.toFixed(4) + ", " + pos.lat.toFixed(4) + ", " + pos.h.toFixed(4) + "}";
}

function XYZtoString(xyz){
	return "(" + xyz[0].toFixed(2) + ", " + xyz[1].toFixed(2) + ", " + xyz[2].toFixed(2) + ")";
}

function Solve(){	
	let solver = new Ceres()
	solver.add_function(function(x){ return Distance3D(x, Positions[0]) - Distances[0]; })
	solver.add_function(function(x){ return Distance3D(x, Positions[1]) - Distances[1]; })
	solver.add_function(function(x){ return Distance3D(x, Positions[2]) - Distances[2]; })
	solver.add_function(function(x){ return Distance3D(x, Positions[3]) - Distances[3]; })
	
	return new Promise(function(resolve,reject) {
		solver.promise.then(function(result) { 
			var x_guess = [
				Mean(Positions[0][0], Positions[1][0], Positions[2][0], Positions[3][0]),
				Mean(Positions[0][1], Positions[1][1], Positions[2][1], Positions[3][1]),
				Mean(Positions[0][2], Positions[1][2], Positions[2][2], Positions[3][2]),
				0
			] //Guess the initial values of the solution.
			var s = solver.solve(x_guess) //Solve the equation
			solver.remove() //required to free the memory in C++
			resolve([s.x[0], s.x[1], s.x[2]]);
		});
	});
}

function DeterminePlanet(parsedPos){	
	Planet = planets[parsedPos.q][parsedPos.p];
	Planet.q = parsedPos.q;
	Planet.p = parsedPos.p;
	Radius = Planet.radius;
	document.getElementById("planet-image").src = Planet.img;
}

function AddInput(index) {
	var coordInput = document.getElementById("coord-input-" + index);
	var distanceInput = document.getElementById("distance-input-" + index);
	var console = document.getElementById("console");
	var resultField = document.getElementById("result-field");
	try {
		if (!coordInput.value){
			throw "Paste in your player coordinates!\n";
		}
		if (!distanceInput.value){
			throw "Type  in scanner reading - the distance from the ore!\n";
		}
		var parsed = ParsePosition(coordInput.value);
		if (Planet == null){
			DeterminePlanet(parsed);
			console.value += "Detected planet " + Planet.name + "\n";
		}
		else if ((Planet.q != parsed.q) || (Planet.p != parsed.p)){
			throw "Different planet detected!\n";
		}
		var xyz = PositionToXYZ(parsed);
		var distance = parseFloat(distanceInput.value);
		console.value += JSON.stringify(parsed) + " -> " + XYZtoString(xyz) + " with distance " + distance + "\n\n";
		Positions[index] = xyz;
		Distances[index] = distance;
		distanceInput.parentElement.classList.add("active");
		window.setTimeout(function(){ distanceInput.parentElement.classList.remove("active"); }, 500);
		if (Distances.filter(function(val){return Boolean(val);}).length == 4){
			Solve().then(function(result){
				console.value += "Solution: " + result + "\n";
				var newPos = PositionToString(XYZtoPosition(result));
				var Delta1 = Distance3D(result, Positions[0]) - Distances[0];
				var Delta2 = Distance3D(result, Positions[1]) - Distances[1];
				var Delta3 = Distance3D(result, Positions[2]) - Distances[2];
				var Delta4 = Distance3D(result, Positions[3]) - Distances[3];
				if (Delta1 + Delta2 + Delta3 + Delta4 > 10){
					resultField.value = "Result: " + newPos + "\n(Warning: position unreliable)";
				} else {
					resultField.value = newPos;
					resultField.focus();
					resultField.select();
					resultField.setSelectionRange(0, 99999);
					document.execCommand("copy");
					resultField.value = "Result: " + newPos + "\n(Copied to clipboard)";
				}
			});
		}
		else
		{
			resultField.value = "Add more measurements...";
		}
	} catch (e) {
		console.value += e + "\n";
		distanceInput.parentElement.classList.add("bad");
		window.setTimeout(function(){ distanceInput.parentElement.classList.remove("bad"); }, 500);
	}
}

function MakeAddInputCallback(i){
	return function() { AddInput(i); };
}

function EstimatePlanetRadius(posA, distanceNorthSouth, distanceEastWest, posB) {
	var a = ParsePosition(posA);
	var b = ParsePosition(posB);
	var angularDistanceNorthSouth = Math.abs(a.lng - b.lng);
	var angularDistanceHorizontal = Math.abs(a.lat - b.lat);
	var radius;
	if (angularDistanceHorizontal > angularDistanceNorthSouth)
	{
		radius = distanceEastWest / Math.sin(DegreesToRadians(angularDistanceHorizontal));
	}
	else
	{
		radius = distanceNorthSouth / Math.sin(DegreesToRadians(angularDistanceNorthSouth));
	}
	console.log("Radius: ", radius);
}
window.EstimatePlanetRadius = EstimatePlanetRadius;

function ParsePositionBackAndForth(pos){
	var parsed = ParsePosition(pos);
	DeterminePlanet(parsed);
	console.log("Parsed to spherical: ", parsed);
	var xyz = PositionToXYZ(parsed);
	console.log("Parsed to xyz: ", xyz);
	var newPos = XYZtoPosition(xyz);
	return PositionToString(newPos);
}
window.ParsePositionBackAndForth = ParsePositionBackAndForth;

var btns = document.getElementsByClassName("coord-input-btn");
var i = 0;
for (i = 0; i < btns.length; i++) {
  btns[i].onclick = MakeAddInputCallback(i);
}

document.getElementById("console").value = "Debug info:\n";

fetch(new URL("../planets.json", window.location))
	.then((response) => {
		return response.json();
	})
	.then((json) => {
		planets = json;
		console.log("Planets loaded", planets);
		document.getElementById("loading-spinner").style.display = "none";
	})
