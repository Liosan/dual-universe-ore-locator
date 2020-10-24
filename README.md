# dual-universe-ore-locator

Work in progress. Web-based tool for finding ore in Dual Universe.

The ore locator uses a technique similar to triangulation. By getting 4 distance readings from the in-game scanner, combined with player positions at the point where the scanner pinged, it is possible to pretty precisely predict the location of the ore, assuming:
- the measurements are taken fairly apart, and the player moved in 3 directions (for example first north-south, then east-west, then up-down) 
- there is only one ore of this type nearby

The Ore Locator uses the [ceres] solver. 

The algorithm, in depth, is as follows:
- Wait until 4 valid position-distance measurements are pasted by the player
- Determine planet to determine it's Radius
- Convert coordinatees from spherical representation (longiguted, latitude, height) to cartesian coordinates (xyz, relative to planet center)
- Use Ceres solver to find point that best suits the given constraints - distances from 4 points
- Convert solution coordinates back to spherical representation
- Print out a position that can be pasted in-game

## Contributing

I'll happilly accept data on the radius of each planet in DU :)

When doing developed, use a local HTTP server, for example python:
```python -m http.server```
Running the above command in the folder where this README is located will makes the ore locator available under localhost:8000.


   [ceres]: <http://nodejs.org>