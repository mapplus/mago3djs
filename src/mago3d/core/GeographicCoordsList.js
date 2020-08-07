'use strict';

/**
 * 어떤 일을 하고 있습니까?
 * @class GeographicCoordsList
 */
var GeographicCoordsList = function(geographicCoordsArray) 
{
	if (!(this instanceof GeographicCoordsList)) 
	{
		throw new Error(Messages.CONSTRUCT_ERROR);
	}
	
	if (geographicCoordsArray !== undefined)
	{ this.geographicCoordsArray = geographicCoordsArray; }
	else
	{ this.geographicCoordsArray = []; }
	this.vboKeysContainer;
	this.owner;
	this.id;
	
	// Aux vars.
	this.points3dList; // used to render.
};

/**
 * push single point
 * @param {GeographicCoord}
 */
GeographicCoordsList.prototype.newGeoCoord = function(lon, lat, alt) 
{
	var geoCoord = new GeographicCoord(lon, lat, alt);
	this.addGeoCoord(geoCoord);
	return geoCoord;
};

/**
 * push single point
 * @param {GeographicCoord}
 */
GeographicCoordsList.prototype.addGeoCoord = function(geographicPoint) 
{
	this.geographicCoordsArray.push(geographicPoint);
	geographicPoint.owner = this;
};

/**
 * push single point
 * @param {GeographicCoord}
 */
GeographicCoordsList.prototype.addGeoCoordsArray = function(geographicPointsArray) 
{
	var geoCoordsCount = geographicPointsArray.length;
	for (var i=0; i<geoCoordsCount; i++)
	{
		this.geographicCoordsArray.push(geographicPointsArray[i]);
		geographicPointsArray[i].owner = this;
	}
};

/**
 * get single point
 * @param {Number} idx the index of target
 */
GeographicCoordsList.prototype.getGeoCoord = function(idx) 
{
	if (this.geographicCoordsArray === undefined)
	{ return undefined; }
	
	return this.geographicCoordsArray[idx];
};

/**
 * Get the number of the point in this list
 * @returns {Number} the number of the points
 */
GeographicCoordsList.prototype.getGeoCoordsCount = function() 
{
	if (this.geographicCoordsArray === undefined)
	{ return 0; }
	
	return this.geographicCoordsArray.length;
};

/**
 * get single point
 * @param {Number} idx the index of target
 * @param {GeographicCoordSegment} resultGeoCoordSegment
 */
GeographicCoordsList.prototype.getGeoCoordSegment = function(idx, resultGeoCoordSegment) 
{
	if (this.geographicCoordsArray === undefined)
	{ return resultGeoCoordSegment; }
	
	var geoCoordsCount = this.geographicCoordsArray.length;
	
	if (geoCoordsCount <= 1)
	{ return resultGeoCoordSegment; }
	
	if (idx > geoCoordsCount - 1)
	{ return resultGeoCoordSegment; }
	
	var nextIdx;
	
	if (idx === geoCoordsCount - 1)
	{ nextIdx = 0; }
	else
	{ nextIdx = idx + 1; }

	var geoCoord1 = this.getGeoCoord(idx);
	var geoCoord2 = this.getGeoCoord(nextIdx);
	
	if (resultGeoCoordSegment === undefined)
	{ resultGeoCoordSegment = new GeographicCoordSegment(); }
	
	resultGeoCoordSegment.strGeoCoord = geoCoord1;
	resultGeoCoordSegment.endGeoCoord = geoCoord2;
	
	return resultGeoCoordSegment;
};

/**
 * 
 * 
 */
GeographicCoordsList.prototype.getCopy = function(resultGeoCoordsListCopy) 
{
	if (resultGeoCoordsListCopy === undefined)
	{ resultGeoCoordsListCopy = new GeographicCoordsList(); }
	
	var geoPointsCount = this.getGeoCoordsCount();
	for (var i=0; i<geoPointsCount; i++)
	{
		var geoCoord = this.getGeoCoord(i);
		var geoCoordCopy = new GeographicCoord(geoCoord.longitude, geoCoord.latitude, geoCoord.altitude);
		resultGeoCoordsListCopy.addGeoCoord(geoCoordCopy);
	}
	
	return resultGeoCoordsListCopy;
};

/**
 * This function returns points3dArray relative to the geoLocIn.
 * @param {GeoLocationData} geoLocIn the information about the axis of this GeographicCoord
 * @param resultPoint3dArray
 * 
 */
GeographicCoordsList.getPointsRelativeToGeoLocation = function(geoLocIn, geoCoordsArray, resultPoints3dArray, options) 
{
	if (resultPoints3dArray === undefined)
	{ resultPoints3dArray = []; }
	
	var geoPointsCount = geoCoordsArray.length;
	
	for (var i=0; i<geoPointsCount; i++)
	{
		var geoCoord = geoCoordsArray[i];
		var geoLocDataManager = geoCoord.getGeoLocationDataManager();
		var geoLoc = geoLocDataManager.getCurrentGeoLocationData();
		if (geoLoc === undefined)
		{
			geoCoord.makeDefaultGeoLocationData();
			geoLoc = geoLocDataManager.getCurrentGeoLocationData();
		}
		
		var posAbs = geoLoc.position;
		resultPoints3dArray[i] = geoLocIn.getTransformedRelativePosition(posAbs, resultPoints3dArray[i]);
	}
	
	return resultPoints3dArray;
};

/**
 * Returns renderableObject of the geoCoordsList.
 */
GeographicCoordsList.getVBOThickLines = function(magoManager, geoCoordsArray, resultVboKeysContainer, options) 
{
	// This function returns thickLines vbo in geoCoords.***
	if (geoCoordsArray === undefined || geoCoordsArray.length < 2)
	{ return resultVboKeysContainer; }

	if (resultVboKeysContainer === undefined)
	{ resultVboKeysContainer = new VBOVertexIdxCacheKeysContainer(); }

	var pointsCount = geoCoordsArray.length;

	// in this case make point4d (x, y, z, w). In "w" save the sign (1 or -1) for the offset in the shader to draw triangles strip.
	var repeats = 4;
	var pointDimension = 4;
	var posByteSize = pointsCount * pointDimension * repeats;
	var posVboDataArray = new Float32Array(posByteSize);
	
	var geoCoord;

	for (var i=0; i<pointsCount; i++)
	{
		geoCoord = geoCoordsArray[i];
		posVboDataArray[i*16] = geoCoord.longitude;
		posVboDataArray[i*16+1] = geoCoord.latitude;
		posVboDataArray[i*16+2] = geoCoord.altitude;
		posVboDataArray[i*16+3] = 1; // order.
		
		posVboDataArray[i*16+4] = geoCoord.longitude;
		posVboDataArray[i*16+5] = geoCoord.latitude;
		posVboDataArray[i*16+6] = geoCoord.altitude;
		posVboDataArray[i*16+7] = -1; // order.
		
		posVboDataArray[i*16+8] = geoCoord.longitude;
		posVboDataArray[i*16+9] = geoCoord.latitude;
		posVboDataArray[i*16+10] = geoCoord.altitude;
		posVboDataArray[i*16+11] = 2; // order.
		
		posVboDataArray[i*16+12] = geoCoord.longitude;
		posVboDataArray[i*16+13] = geoCoord.latitude;
		posVboDataArray[i*16+14] = geoCoord.altitude;
		posVboDataArray[i*16+15] = -2; // order.
	}
	
	// Check if must make color vbo.
	var strColor4 = new Color(0.6, 0.9, 0.99, 1.0);
	var endColor4 = new Color(0.6, 0.9, 0.99, 1.0);
	
	var colVboDataArray;
	var makeColorVbo = false;
	if (options)
	{
		if (options.color)
		{
			strColor4.setRGBA(options.color.r, options.color.g, options.color.b, options.color.a);
			endColor4.setRGBA(options.color.r, options.color.g, options.color.b, options.color.a);
		}
		
		if (options.startColor)
		{
			strColor4.setRGBA(options.startColor.r, options.startColor.g, options.startColor.b, options.startColor.a);
			makeColorVbo = true;
		}
		
		if (options.endColor)
		{
			endColor4.setRGBA(options.endColor.r, options.endColor.g, options.endColor.b, options.endColor.a);
			makeColorVbo = true;
		}
	}
	
	// Make the color vbo if necessary.
	if (makeColorVbo)
	{
		colVboDataArray = new Uint8Array(pointsCount * 4 * repeats);
		
		var currColor4 = new Color(0.6, 0.9, 0.99, 1.0);
		currColor4.copyFrom(strColor4);
		var w = 1.0; // weight.***
		var r, g, b, a;
		for (var i=0; i<pointsCount; i++)
		{
			w = 1.0 - (i/(pointsCount-1));
			currColor4 = Color.mix(strColor4, endColor4, w);
			
			colVboDataArray[i*16] = Math.floor(currColor4.r*255);
			colVboDataArray[i*16+1] = Math.floor(currColor4.g*255);
			colVboDataArray[i*16+2] = Math.floor(currColor4.b*255);
			colVboDataArray[i*16+3] = Math.floor(currColor4.a*255);
			
			colVboDataArray[i*16+4] = Math.floor(currColor4.r*255);
			colVboDataArray[i*16+5] = Math.floor(currColor4.g*255);
			colVboDataArray[i*16+6] = Math.floor(currColor4.b*255);
			colVboDataArray[i*16+7] = Math.floor(currColor4.a*255);
			
			colVboDataArray[i*16+8] = Math.floor(currColor4.r*255);
			colVboDataArray[i*16+9] = Math.floor(currColor4.g*255);
			colVboDataArray[i*16+10] = Math.floor(currColor4.b*255);
			colVboDataArray[i*16+11] = Math.floor(currColor4.a*255);
			
			colVboDataArray[i*16+12] = Math.floor(currColor4.r*255);
			colVboDataArray[i*16+13] = Math.floor(currColor4.g*255);
			colVboDataArray[i*16+14] = Math.floor(currColor4.b*255);
			colVboDataArray[i*16+15] = Math.floor(currColor4.a*255);
		}
	}
	var vbo = resultVboKeysContainer.newVBOVertexIdxCacheKey();
	vbo.setDataArrayPos(posVboDataArray, magoManager.vboMemoryManager, pointDimension);
	
	if (colVboDataArray)
	{
		vbo.setDataArrayCol(colVboDataArray, magoManager.vboMemoryManager);
	}
	
	return resultVboKeysContainer;
};

/**
 * Returns expanded geoCoordsArray of the geoCoordsList.
 */
GeographicCoordsList.getRenderableExpandedAndExtrudedObjectOfGeoCoordsArray = function(geoCoordsArray, magoManager, options) 
{
	// This function returns a thickLine extruded object, for render in stencil buffer.***
	if (geoCoordsArray === undefined || geoCoordsArray.length === 0)
	{ return undefined; }
	
	// 1rst, make points3dList relative to the 1rst_geoCoord.
	var geoCoordsCount = geoCoordsArray.length;
	var firstGeoCoord = geoCoordsArray[0];
	var geoLoc = ManagerUtils.calculateGeoLocationData(firstGeoCoord.longitude, firstGeoCoord.latitude, firstGeoCoord.altitude, 0, 0, 0, undefined);
	
	// 1rst, make bottom & up geoCoordsArray.***
	var bottomGeoCoordsArray = [];
	var topGeoCoordsArray = [];
	for (var i=0; i<geoCoordsCount; i++)
	{
		var originalGeoCoord = geoCoordsArray[i];
		var bottomGeoCoord = new GeographicCoord(originalGeoCoord.longitude, originalGeoCoord.latitude, 500.0); // altitude -10.0.
		bottomGeoCoordsArray.push(bottomGeoCoord);

		var topGeoCoord = new GeographicCoord(originalGeoCoord.longitude, originalGeoCoord.latitude, 1000.0); // altitude 1000.0.
		topGeoCoordsArray.push(topGeoCoord);
	}

	// Bottom geoCoords.******************************************************************************************
	var bottomPoints3dLCArray = GeographicCoordsList.getPointsRelativeToGeoLocation(geoLoc, bottomGeoCoordsArray, undefined);

	// Top geoCoords.******************************************************************************************
	var topPoints3dLCArray = GeographicCoordsList.getPointsRelativeToGeoLocation(geoLoc, topGeoCoordsArray, undefined);

	
	
	// Create a vectorMesh.
	if (options === undefined)
	{
		options = {
			thickness: 2.0
		};
	}
	else
	{
		if (options.thickness === undefined)
		{ options.thickness = 2.0; }
	}

	var vectorMesh = new VectorExtrudedMesh(options);
	
	var optionsThickLine = {
		colorType: "alphaGradient"
	};
	vectorMesh.vboKeysContainer = Point3DList.getVboThickLinesExtruded(magoManager, bottomPoints3dLCArray, topPoints3dLCArray, vectorMesh.vboKeysContainer, options);
	
	var renderableObject = new RenderableObject();
	renderableObject.geoLocDataManager = new GeoLocationDataManager();
	renderableObject.geoLocDataManager.addGeoLocationData(geoLoc);
	renderableObject.objectType = MagoRenderable.OBJECT_TYPE.VECTORMESH;
	renderableObject.objectsArray.push(vectorMesh);
	
	return renderableObject;
};

/**
 * Returns renderableObject of the geoCoordsList.
 */
GeographicCoordsList.getRenderableObjectOfGeoCoordsArray = function(geoCoordsArray, magoManager, options) 
{
	if (geoCoordsArray === undefined || geoCoordsArray.length === 0)
	{ return undefined; }
	
	// 1rst, make points3dList relative to the 1rst_geoCoord.
	var firstGeoCoord = geoCoordsArray[0];
	var geoLoc = ManagerUtils.calculateGeoLocationData(firstGeoCoord.longitude, firstGeoCoord.latitude, firstGeoCoord.altitude, 0, 0, 0, undefined);
	
	var points3dLCArray = GeographicCoordsList.getPointsRelativeToGeoLocation(geoLoc, geoCoordsArray, undefined);
	
	// Now, for each point, set attributes by speed & others.
	
	
	// Create a vectorMesh.
	if (options === undefined)
	{
		options = {
			thickness: 2.0
		};
	}
	else
	{
		if (options.thickness === undefined)
		{ options.thickness = 2.0; }
	}

	var vectorMesh = new VectorMesh(options);
	
	var optionsThickLine = {
		colorType: "alphaGradient"
	};
	vectorMesh.vboKeysContainer = Point3DList.getVboThickLines(magoManager, points3dLCArray, vectorMesh.vboKeysContainer, options);
	
	var renderableObject = new RenderableObject();
	renderableObject.geoLocDataManager = new GeoLocationDataManager();
	renderableObject.geoLocDataManager.addGeoLocationData(geoLoc);
	renderableObject.objectType = MagoRenderable.OBJECT_TYPE.VECTORMESH;
	renderableObject.objectsArray.push(vectorMesh);
	
	return renderableObject;
};

/**
 * This function returns points3dArray relative to the geoLocIn.
 * @param {GeoLocationData} geoLocIn the information about the axis of this GeographicCoord
 * @param resultPoint3dArray
 * 
 */
GeographicCoordsList.prototype.getPointsWorldCoord = function(resultPoints3dArray) 
{
	if (resultPoints3dArray === undefined)
	{ resultPoints3dArray = []; }
	
	var geoPointsCount = this.getGeoCoordsCount();
	
	for (var i=0; i<geoPointsCount; i++)
	{
		var geoCoord = this.getGeoCoord(i);
		var geoLocDataManager = geoCoord.getGeoLocationDataManager();
		var geoLoc = geoLocDataManager.getCurrentGeoLocationData();
		if (geoLoc === undefined)
		{
			geoCoord.makeDefaultGeoLocationData();
			geoLoc = geoLocDataManager.getCurrentGeoLocationData();
		}
		
		var posAbs = geoLoc.position;
		resultPoints3dArray[i] = posAbs;
	}
	
	return resultPoints3dArray;
};

/**
 * Clear the data in this instance and delete the vbo info of this instance
 */
GeographicCoordsList.prototype.deleteObjects = function(vboMemManager) 
{
	if (this.geographicCoordsArray !== undefined)
	{
		var geoPointsCount = this.getGeoCoordsCount();
		
		for (var i=0; i<geoPointsCount; i++)
		{
			this.geographicCoordsArray[i].deleteGlObjects(vboMemManager);
			this.geographicCoordsArray[i] = undefined;
		}
		this.geographicCoordsArray = undefined;
	}
	
	if (this.vboKeysContainer !== undefined)
	{
		this.vboKeysContainer.deleteGlObjects(vboMemManager);
		this.vboKeysContainer = undefined;
	}
	
	this.owner = undefined;
};



/**
 * Make Lines making the first point as the origin for the other points. Change the points to the GeographicCoords.
 */
GeographicCoordsList.prototype.test__makeThickLines = function(magoManager) 
{
	// 1rst, make lines.
	this.makeLines(magoManager);
	
	if (this.points3dList === undefined)
	{ return; }
	
	// now, make thickLines.
	var resultVboKeysContainer = Point3DList.getVboThickLines(magoManager, this.points3dList.pointsArray, undefined);
	
	this.points3dList.vboKeysContainer = resultVboKeysContainer;
};

/**
 * 
 */
GeographicCoordsList.prototype.getGeographicExtent = function(resultGeographicExtent) 
{
	if (!resultGeographicExtent)
	{ resultGeographicExtent = new GeographicExtent(); }
	
	var geoCoord;
	var geoCoordsCount = this.geographicCoordsArray.length;
	for (var i=0; i<geoCoordsCount; i++)
	{
		geoCoord = this.geographicCoordsArray[i];
		if (i === 0)
		{
			resultGeographicExtent.setInitExtent(geoCoord.longitude, geoCoord.latitude, geoCoord.altitude);
		}
		else 
		{
			resultGeographicExtent.addGeographicCoord(geoCoord);
		}
	}
	
	return resultGeographicExtent;
};

/**
 * 
 */
GeographicCoordsList.prototype.getMiddleGeographicCoords = function(resultMiddleGeoCoords) 
{
	var geoExtent = this.getGeographicExtent();
	return geoExtent.getMidPoint(resultMiddleGeoCoords);
};

/**
 * 
 */
GeographicCoordsList.prototype.addAltitude = function(length) 
{
	var geoCoord;
	var geoCoordsCount = this.geographicCoordsArray.length;
	for (var i=0; i<geoCoordsCount; i++)
	{
		geoCoord = this.geographicCoordsArray[i];
		geoCoord.altitude += length;
	}
};



/**
 * 
 */
GeographicCoordsList.prototype.getExtrudedMeshRenderableObject = function(height, bLoop, resultRenderableObject, magoManager, extrudeDirWC) 
{
	if (!this.geographicCoordsArray || this.geographicCoordsArray.length === 0)
	{ return resultRenderableObject; }
	
	if (!resultRenderableObject)
	{
		resultRenderableObject = new RenderableObject();
	}
	resultRenderableObject.geoLocDataManager = new GeoLocationDataManager();
	var geoLocData = resultRenderableObject.geoLocDataManager.newGeoLocationData();
	
	// The origin of this object is in the middle of this geoCoordsList.
	var midGeoCoord = this.getMiddleGeographicCoords();
	
	// Make the topGeoCoordsList.
	var topGeoCoordsList = this.getCopy();
	
	// Reassign the altitude on the geoCoordsListCopy.
	topGeoCoordsList.addAltitude(height);
	
	// All points3d is referenced to the middleGeoCoord.
	ManagerUtils.calculateGeoLocationData(midGeoCoord.longitude, midGeoCoord.latitude, midGeoCoord.altitude, 0, 0, 0, geoLocData);
	var basePoints3dArray = GeographicCoordsList.getPointsRelativeToGeoLocation(geoLocData, this.geographicCoordsArray, undefined);
	var topPoints3dArray = GeographicCoordsList.getPointsRelativeToGeoLocation(geoLocData, topGeoCoordsList.geographicCoordsArray, undefined);
	
	// Now, with basePoints3dArray & topPoints3dArray make a mesh.
	// Create a VtxProfilesList.
	var vtxProfilesList = new VtxProfilesList();
	var baseVtxProfile = vtxProfilesList.newVtxProfile();
	baseVtxProfile.makeByPoints3DArray(basePoints3dArray, undefined); 
	var topVtxProfile = vtxProfilesList.newVtxProfile();
	topVtxProfile.makeByPoints3DArray(topPoints3dArray, undefined); 
	
	var bIncludeBottomCap = true;
	var bIncludeTopCap = true;
	var solidMesh = vtxProfilesList.getMesh(undefined, bIncludeBottomCap, bIncludeTopCap);
	var surfIndepMesh = solidMesh.getCopySurfaceIndependentMesh();
	surfIndepMesh.calculateVerticesNormals();
	
	resultRenderableObject.objectsArray.push(surfIndepMesh);
	return resultRenderableObject;
};

/**
 * Make Lines making the first point as the origin for the other points. Change the points to the GeographicCoords.
 */
GeographicCoordsList.prototype.makeLines = function(magoManager) 
{
	if (this.geographicCoordsArray === undefined || this.geographicCoordsArray.length === 0)
	{ return false; }
	
	// To render lines, use Point3DList class object.
	if (this.points3dList === undefined)
	{ this.points3dList = new Point3DList(); }
	
	var geoLoc = this.points3dList.getGeographicLocation();
	
	// Take the 1rst geographicCoord's geoLocation.
	var geoCoord = this.getGeoCoord(0);
	var geoLocDataManagerFirst = geoCoord.getGeoLocationDataManager();
	var geoLocFirst = geoLocDataManagerFirst.getCurrentGeoLocationData();
	
	// If has no geoLocationData, then create it.***
	if (geoLocFirst === undefined)
	{ geoLocFirst = ManagerUtils.calculateGeoLocationData(geoCoord.longitude, geoCoord.latitude, geoCoord.altitude, undefined, undefined, undefined, geoLocFirst, magoManager); }
	
	geoLoc.copyFrom(geoLocFirst);
	
	var points3dArray = GeographicCoordsList.getPointsRelativeToGeoLocation(geoLoc, this.geographicCoordsArray, undefined);
	this.points3dList.deleteVboKeysContainer(magoManager);
	this.points3dList.deletePoints3d();
	this.points3dList.addPoint3dArray(points3dArray);
	
};

/**
 * Render lines
 */
GeographicCoordsList.prototype.renderLines = function(magoManager, shader, renderType, bLoop, bEnableDepth) 
{
	if (this.geographicCoordsArray === undefined)
	{ return false; }
	
	if (this.points3dList === undefined)
	{ return false; }
	
	var shader = magoManager.postFxShadersManager.getShader("pointsCloud");
	shader.useProgram();
	shader.disableVertexAttribArrayAll();
	shader.resetLastBuffersBinded();
	shader.enableVertexAttribArray(shader.position3_loc);
	shader.bindUniformGenerals();
	
	var gl = magoManager.sceneState.gl;
	gl.uniform1i(shader.bPositionCompressed_loc, false);
	gl.uniform1i(shader.bUse1Color_loc, true);
	gl.uniform4fv(shader.oneColor4_loc, [1.0, 1.0, 0.1, 1.0]); //.
	gl.uniform1f(shader.fixPointSize_loc, 5.0);
	gl.uniform1i(shader.bUseFixPointSize_loc, true);
	
	this.points3dList.renderLines(magoManager, shader, renderType, bLoop, bEnableDepth);
	
	shader.disableVertexAttribArrayAll();
};

/**
 * Rendering this feature
 * @param magoManager
 * @param shader
 * @param renderType
 * @param bEnableDepth
 * 
 */
GeographicCoordsList.prototype.renderPoints = function(magoManager, shader, renderType, bEnableDepth) 
{
	if (this.geographicCoordsArray === undefined)
	{ return false; }
	
	var gl = magoManager.sceneState.gl;
	
	//var vertexAttribsCount = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
	//for(var i = 0; i<vertexAttribsCount; i++)
	//	gl.disableVertexAttribArray(i);

	var shaderLocal = magoManager.postFxShadersManager.getShader("pointsCloud"); // provisional. Use the currentShader of argument.
	shaderLocal.useProgram();
	
	shaderLocal.disableVertexAttribArrayAll();
	shaderLocal.resetLastBuffersBinded();

	shaderLocal.enableVertexAttribArray(shaderLocal.position3_loc);
	
	shaderLocal.bindUniformGenerals();
	
	gl.uniform1i(shaderLocal.bPositionCompressed_loc, false);
	gl.uniform1i(shaderLocal.bUse1Color_loc, true);
	gl.uniform4fv(shaderLocal.oneColor4_loc, [1.0, 1.0, 0.1, 1.0]); //.
	gl.uniform1f(shaderLocal.fixPointSize_loc, 5.0);
	gl.uniform1i(shaderLocal.bUseFixPointSize_loc, 1);
	
	if (bEnableDepth === undefined)
	{ bEnableDepth = true; }
	
	if (bEnableDepth)
	{ gl.enable(gl.DEPTH_TEST); }
	else
	{ gl.disable(gl.DEPTH_TEST); }

	// Render pClouds.
	var geoCoord;
	var geoCoordsCount = this.geographicCoordsArray.length;
	for (var i=0; i<geoCoordsCount; i++)
	{
		geoCoord = this.geographicCoordsArray[i];
		geoCoord.renderPoint(magoManager, shaderLocal, gl, renderType);
	}
	
	// Check if exist selectedGeoCoord.
	var currSelected = magoManager.selectionManager.getSelectedGeneral();
	if (currSelected !== undefined && currSelected.constructor.name === "GeographicCoord")
	{
		gl.uniform4fv(shaderLocal.oneColor4_loc, [1.0, 0.1, 0.1, 1.0]); //.
		gl.uniform1f(shaderLocal.fixPointSize_loc, 10.0);
		currSelected.renderPoint(magoManager, shaderLocal, gl, renderType);
	}
	
	shaderLocal.disableVertexAttribArrayAll();
	gl.enable(gl.DEPTH_TEST);
	
	// Write coords.
	
	var canvas = magoManager.getObjectLabel();
	var ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.font = "13px Arial";

	var gl = magoManager.sceneState.gl;
	var worldPosition;
	var screenCoord;
	for (var i=0; i<geoCoordsCount; i++)
	{
		geoCoord = this.geographicCoordsArray[i];
		var geoLocDataManager = geoCoord.getGeoLocationDataManager();
		var geoLoc = geoLocDataManager.getCurrentGeoLocationData();
		worldPosition = geoLoc.position;
		screenCoord = ManagerUtils.calculateWorldPositionToScreenCoord(gl, worldPosition.x, worldPosition.y, worldPosition.z, screenCoord, magoManager);
		screenCoord.x += 15;
		screenCoord.y -= 15;
		//var geoCoords = geoLoc.geographicCoord;
		if (screenCoord.x >= 0 && screenCoord.y >= 0)
		{
			var word = "lon: " + geoCoord.longitude.toFixed(5) + ", lat: " + geoCoord.latitude.toFixed(5);
			ctx.strokeText(word, screenCoord.x, screenCoord.y);
			ctx.fillText(word, screenCoord.x, screenCoord.y);
		}
	}
	
	ctx.restore();
	
	// return the current shader.
	shader.useProgram();
};

/**
 * Change Point3D features from WGS84 Points
 * @param resultPoint3DArray the target
 */
GeographicCoordsList.prototype.getWgs84Points3D = function(resultPoint3DArray) 
{
	if (resultPoint3DArray === undefined)
	{ resultPoint3DArray = []; }
	
	var geoCoord;
	var geoCoordsCount = this.geographicCoordsArray.length;
	for (var i=0; i<geoCoordsCount; i++)
	{
		geoCoord = this.geographicCoordsArray[i];
		var wgs84Point3d = geoCoord.getWgs84Point3D(undefined);
		resultPoint3DArray.push(wgs84Point3d);
	}
	
	return resultPoint3DArray;
};









































