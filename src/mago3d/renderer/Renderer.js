'use strict';

/**
 * This class contains the current objects that are rendering. 
 * @class CurrentObjectsRendering
 */
var CurrentObjectsRendering = function() 
{
	if (!(this instanceof CurrentObjectsRendering)) 
	{
		throw new Error(Messages.CONSTRUCT_ERROR);
	}
	
	// General objects rendering, as currNode, currBuilding, currOctree, currRefObject.
	// This class contains the current objects that are rendering. 
	
	/**
	 * The current node that is in rendering process.
	 * @type {Node}
	 * @default undefined
	 */
	this.curNode = undefined;
	
	/**
	 * The current building that is in rendering process.
	 * @type {NeoBuilding}
	 * @default undefined
	 */
	this.curBuilding = undefined;
	
	/**
	 * The current octree (octree of a building) that is in rendering process.
	 * @type {Octree}
	 * @default undefined
	 */
	this.curOctree = undefined;
	
	/**
	 * The current object that is in rendering process.
	 * @type {NeoReference}
	 * @default undefined
	 */
	this.curObject = undefined;
};


/**
 * This class manages the rendering of all classes.
 * @class Renderer
 */
var Renderer = function(manoManager) 
{
	if (!(this instanceof Renderer)) 
	{
		throw new Error(Messages.CONSTRUCT_ERROR);
	}
	
	/**
	 * The current objects that is in rendering process.
	 * @type {CurrentObjectsRendering}
	 * @default CurrentObjectsRendering
	 */
	this.currentObjectsRendering = new CurrentObjectsRendering();
	
	/**
	 * This parameter indicates that if is using normals in the shader.
	 * @type {Boolean}
	 * @default true
	 */
	this.renderNormals = true;
	
	/**
	 * This parameter indicates that if is using textures in the shader.
	 * @type {Boolean}
	 * @default true
	 */
	this.renderTexture = true;
	
	/**
	 * The main mago3d class. This object manages the main pipe-line of the Mago3D.
	 * @type {ManoManager}
	 * @default ManoManager
	 */
	this.magoManager = manoManager;
};

/**
 * This function renders a vboContainer.
 * @param {WebGLRenderingContext} gl WebGL rendering context.
 * @param {VBOVertexIdxCacheKeysContainer} vboContainer This object contains "VBOVertexIdxCacheKey" objects.
 * @param {ManoManager} magoManager The main mago3d class. This object manages the main pipe-line of the Mago3D.
 * @param {PostFxShader} shader Shader.
 * @param {Boolean} renderWireframe Parameter that indicates if render in wireframe mode.
 */

Renderer.prototype.renderVboContainer = function(gl, vboContainer, magoManager, shader, renderWireframe) 
{
	if (vboContainer === undefined)
	{ return; }
	
	var cacheKeys_count = vboContainer.vboCacheKeysArray.length;
	// Must applicate the transformMatrix of the reference object.
	
	var indicesCount;

	for (var n=0; n<cacheKeys_count; n++) // Original.
	{
		//var mesh_array = block.viArraysContainer._meshArrays[n];
		var vbo_vi_cacheKey_aux = vboContainer.vboCacheKeysArray[n];
		
		if (!vbo_vi_cacheKey_aux.bindDataPosition(shader, magoManager.vboMemoryManager))
		{ return false; }
		
		if (!vbo_vi_cacheKey_aux.bindDataNormal(shader, magoManager.vboMemoryManager))
		{ return false; }
		
		if (!vbo_vi_cacheKey_aux.bindDataIndice(shader, magoManager.vboMemoryManager))
		{ return false; }

		/*
		if (shader.texCoord2_loc !== -1 && this.renderTexture) 
		{
			if (!vbo_vi_cacheKey_aux.isReadyTexCoords(gl, magoManager.vboMemoryManager))
			{ continue; }

			gl.enableVertexAttribArray(shader.texCoord2_loc);
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo_vi_cacheKey_aux.meshTexcoordsCacheKey);
			gl.vertexAttribPointer(shader.texCoord2_loc, 2, gl.FLOAT, false, 0, 0);
		}
		else 
		{
			if (shader.texCoord2_loc !== -1) { gl.disableVertexAttribArray(shader.texCoord2_loc); }
		}
		*/

		// Indices.
		if (magoManager.isCameraMoving)
		{
			indicesCount = vbo_vi_cacheKey_aux.indicesCount;
		}
		else
		{
			indicesCount = vbo_vi_cacheKey_aux.indicesCount;
		}
		
		if (renderWireframe)
		{
			gl.drawElements(gl.LINES, vbo_vi_cacheKey_aux.indicesCount, gl.UNSIGNED_SHORT, 0); // Wireframe.

		}
		else 
		{
			gl.drawElements(gl.TRIANGLES, indicesCount, gl.UNSIGNED_SHORT, 0); // Fill.
		}
	}
};


/**
 * 어떤 일을 하고 있습니까?
 * @param gl 변수
 */
 
Renderer.prototype.renderVbo = function(gl, shader, vboPosKey, vboNorKey, vboColKey, vboTexCoordKey, vboIdxKey) 
{
	if (vboPosKey !== shader.last_vboPos_binded)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, vboKey.meshVertexCacheKey);
		gl.vertexAttribPointer(shader.position3_loc, 3, gl.FLOAT, false, 0, 0);
		shader.last_vboPos_binded = vboKey.meshVertexCacheKey;
	}
};


/**
 * 어떤 일을 하고 있습니까?
 * @param gl 변수
 */
Renderer.prototype.renderNodes = function(gl, visibleNodesArray, magoManager, shader, renderTexture, renderType, maxSizeToRender, refMatrixIdxKey) 
{
	var node;
	var rootNode;
	var geoLocDataManager;
	var neoBuilding;
	var minSize = 0.0;
	var lowestOctreesCount;
	var lowestOctree;
	var isInterior = false; // no used.
	
	// set webgl options.
	gl.enable(gl.DEPTH_TEST);
	if (MagoConfig.getPolicy().geo_cull_face_enable === "true") 
	{
		gl.enable(gl.CULL_FACE);
	}
	else 
	{
		gl.disable(gl.CULL_FACE);
	}

	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	
	if (renderType === 2)
	{
		shader.disableVertexAttribArray(shader.texCoord2_loc);
		shader.disableVertexAttribArray(shader.normal3_loc);
	}
	if (renderType === 0)
	{
		shader.disableVertexAttribArray(shader.texCoord2_loc);
		shader.disableVertexAttribArray(shader.normal3_loc);
		shader.disableVertexAttribArray(shader.color4_loc);
	}
	
	var flipYTexCoord = false;
	
	// do render.
	var nodesCount = visibleNodesArray.length;
	for (var i=0; i<nodesCount; i++)
	{
		node = visibleNodesArray[i];
		node.renderContent(magoManager, shader, renderType, refMatrixIdxKey);
	}
};

Renderer.prototype.getPointsCountForDistance = function(distToCam, realPointsCount, magoManager) 
{
	var vertices_count = realPointsCount;
	var pCloudSettings = magoManager.magoPolicy.getPointsCloudSettings();
		
	if (distToCam <= 10)
	{
		// Render all points.
	}
	else if (distToCam < 100)
	{
		vertices_count =  Math.floor(pCloudSettings.MaxPerUnitPointsRenderDistToCam100m * realPointsCount);
	}
	else if (distToCam < 200)
	{
		vertices_count = Math.floor(pCloudSettings.MaxPerUnitPointsRenderDistToCam200m * realPointsCount);
	}
	else if (distToCam < 400)
	{
		vertices_count = Math.floor(pCloudSettings.MaxPerUnitPointsRenderDistToCam400m * realPointsCount);
	}
	else if (distToCam < 800)
	{
		vertices_count = Math.floor(pCloudSettings.MaxPerUnitPointsRenderDistToCam800m * realPointsCount);
	}
	else if (distToCam < 1600)
	{
		vertices_count = Math.floor(pCloudSettings.MaxPerUnitPointsRenderDistToCam1600m * realPointsCount);
	}
	else
	{
		vertices_count = Math.floor(pCloudSettings.MaxPerUnitPointsRenderDistToCamMoreThan1600m * realPointsCount);
	}
	
	return vertices_count;
};

/**
 * 어떤 일을 하고 있습니까?
 * @param gl 변수
 * @param neoRefList_array 변수
 * @param neoBuilding 변수
 * @param magoManager 변수
 * @param isInterior 변수
 * @param standardShader 변수
 * @param renderTexture 변수
 * @param ssao_idx 변수
 */
Renderer.prototype.renderPCloud = function(gl, pCloud, magoManager, shader, ssao_idx, distToCam, lod) 
{
	// Note: "pCloud" is "Lego" class.
	if (pCloud.vbo_vicks_container.vboCacheKeysArray.length === 0) 
	{
		return;
	}
	gl.frontFace(gl.CCW);
	
	var vbo_vicky = pCloud.vbo_vicks_container.vboCacheKeysArray[0]; // there are only one.
	var vertices_count = vbo_vicky.vertexCount;
	
	if (vertices_count === 0) 
	{ return; }
	
	var pointsCountToDraw = this.getPointsCountForDistance(distToCam, vertices_count, magoManager);
	
	if (magoManager.isCameraMoving)// && !isInterior && magoManager.isCameraInsideBuilding)
	{
		pointsCountToDraw = Math.floor(pointsCountToDraw/5);
	}

	if (pointsCountToDraw <= 0)
	{ return; }

	if (ssao_idx === 0) // depth.
	{
		// 1) Position.
		if (!vbo_vicky.bindDataPosition(shader, magoManager.vboMemoryManager))
		{ return false; }
		
		gl.drawArrays(gl.POINTS, 0, pointsCountToDraw);
	}
	else if (ssao_idx === 1) // color.
	{
		if (!vbo_vicky.bindDataPosition(shader, magoManager.vboMemoryManager))
		{ return false; }

		if (!vbo_vicky.bindDataColor(shader, magoManager.vboMemoryManager))
		{ return false; }
		
		gl.drawArrays(gl.POINTS, 0, pointsCountToDraw);
		
	}
	
	
};

/**
 * 어떤 일을 하고 있습니까?
 * @param gl 변수
 */
Renderer.prototype.renderNeoBuildingsPCloud = function(gl, visibleNodesArray, magoManager, shader, renderTexture, ssao_idx) 
{
	var node;
	var rootNode;
	var geoLocDataManager;
	var neoBuilding;
	var lowestOctreesCount;
	var lowestOctree;
	var lastExtureId;
	
	// Do some gl settings.
	//gl.uniform1i(shader.bUse1Color_loc, false);
	gl.uniform1f(shader.fixPointSize_loc, 1.0);
	gl.uniform1i(shader.bUseFixPointSize_loc, false);
	
	var nodesCount = visibleNodesArray.length;
	for (var i=0; i<nodesCount; i++)
	{
		node = visibleNodesArray[i];
		
		rootNode = node.getRoot();
		geoLocDataManager = rootNode.data.geoLocDataManager;
		neoBuilding = node.data.neoBuilding;
		
		if (neoBuilding === undefined)
		{ continue; }
		
		if (neoBuilding.octree === undefined)
		{ continue; }

		var projectDataType = neoBuilding.metaData.projectDataType;
		
		var buildingGeoLocation = geoLocDataManager.getCurrentGeoLocationData();
		gl.uniformMatrix4fv(shader.buildingRotMatrix_loc, false, buildingGeoLocation.rotMatrix._floatArrays);
		gl.uniform3fv(shader.buildingPosHIGH_loc, buildingGeoLocation.positionHIGH);
		gl.uniform3fv(shader.buildingPosLOW_loc, buildingGeoLocation.positionLOW);
		
		if (projectDataType !== undefined && projectDataType === 4)
		{
			// Old.
			/*
			for (var j=0; j<lowestOctreesCount; j++) 
			{
				lowestOctree = allVisibles[j];

				if (lowestOctree.lego === undefined) 
				{
					lowestOctree.lego = new Lego();
					lowestOctree.lego.fileLoadState = CODE.fileLoadState.READY;
					lowestOctree.lego.legoKey = lowestOctree.octreeKey + "_lego";
					continue;
				}
				
				if (lowestOctree.lego.fileLoadState !== CODE.fileLoadState.PARSE_FINISHED)
				{ continue; }

			
				// data compression.
				var posCompressed = false;
				if (lowestOctree.lego.bPositionsCompressed !== undefined)
				{
					posCompressed = lowestOctree.lego.bPositionsCompressed;
				}
				gl.uniform1i(shader.bPositionCompressed_loc, posCompressed);
				
				// If data is compressed, then set uniforms.
				//gl.uniform1i(shader.posDataByteSize_loc, 2);
				//gl.uniform1i(shader.texCoordByteSize_loc, 2);
				var bbox = lowestOctree.lego.bbox;
				gl.uniform3fv(shader.bboxSize_loc, [bbox.getXLength(), bbox.getYLength(), bbox.getZLength()]); //.
				gl.uniform3fv(shader.minPosition_loc, [bbox.minX, bbox.minY, bbox.minZ]); //.
				var lod = 2;
				var distToCam = lowestOctree.distToCamera;
				if (distToCam < 100)
				{ var hola = 0; }
				
				this.renderPCloud(gl, lowestOctree.lego, magoManager, shader, ssao_idx, distToCam, lod);

				gl.bindBuffer(gl.ARRAY_BUFFER, null);
			}
			*/
		}
		else if (projectDataType !== undefined && projectDataType === 5)
		{
			if (magoManager.myCameraRelative === undefined)
			{ magoManager.myCameraRelative = new Camera(); }

			var relativeCam = magoManager.myCameraRelative;
			relativeCam.frustum.copyParametersFrom(magoManager.myCameraSCX.bigFrustum);
			relativeCam = buildingGeoLocation.getTransformedRelativeCamera(magoManager.sceneState.camera, relativeCam);
			relativeCam.calculateFrustumsPlanes();
			var renderType = ssao_idx;// testing.
			var bPrepareData = true;
			
			neoBuilding.octree.test__renderPCloud(magoManager, neoBuilding, renderType, shader, relativeCam, bPrepareData);
		}
	}
	
	shader.disableVertexAttribArrayAll();
};

Renderer.prototype.enableStencilBuffer = function(gl)
{
	// Active stencil if the object is selected.
	gl.enable(gl.STENCIL_TEST);
	
	gl.stencilFunc(gl.ALWAYS, 1, 1);
	// (stencil-fail: replace), (stencil-pass & depth-fail: replace), (stencil-pass & depth-pass: replace).
	//gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);
	gl.stencilOp(gl.KEEP, gl.REPLACE, gl.REPLACE);
	gl.enable(gl.POLYGON_OFFSET_FILL);
};

Renderer.prototype.disableStencilBuffer = function(gl)
{
	gl.disable(gl.STENCIL_TEST);
	gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
	gl.disable(gl.POLYGON_OFFSET_FILL);
};

/**
 * 어떤 일을 하고 있습니까?
 * @param gl 변수
 * @param neoRefList_array 변수
 * @param magoManager 변수
 * @param shader 변수
 * @param renderTexture 변수
 * @param ssao_idx 변수
 */
Renderer.prototype.renderObject = function(gl, renderable, magoManager, shader, ssao_idx, bRenderLines, primitiveType)
{
	var vbo_vicks_container = renderable.getVboKeysContainer();
	
	if (vbo_vicks_container === undefined)
	{ return; }
	
	if (vbo_vicks_container.vboCacheKeysArray.length === 0) 
	{ return; }
	

	if (bRenderLines === undefined)
	{ bRenderLines = false; }


	var vbosCount = vbo_vicks_container.getVbosCount();
	for (var i=0; i<vbosCount; i++)
	{
		// 1) Position.
		var vbo_vicky = vbo_vicks_container.vboCacheKeysArray[i]; // there are only one.

		var vertices_count = vbo_vicky.vertexCount;
		if (vertices_count === 0) 
		{ return; }

		if (!vbo_vicky.bindDataPosition(shader, magoManager.vboMemoryManager))
		{ return false; }

		if (ssao_idx === 1) // ssao.
		{
			if (!vbo_vicky.bindDataNormal(shader, magoManager.vboMemoryManager))
			{ return false; }

			if (!vbo_vicky.bindDataColor(shader, magoManager.vboMemoryManager))
			{ return false; }
			
			// TexCoords todo:
		}
		
		if (bRenderLines === false)
		{
			if (vbo_vicky.indicesCount > 0)
			{
				if (!vbo_vicky.bindDataIndice(shader, magoManager.vboMemoryManager))
				{ return false; }

				gl.drawElements(gl.TRIANGLES, vbo_vicky.indicesCount, gl.UNSIGNED_SHORT, 0); // Fill.
			}
			else 
			{
				gl.drawArrays(gl.TRIANGLES, 0, vertices_count);
			}
		}
		else 
		{
			gl.drawArrays(gl.LINE_STRIP, 0, vertices_count);
			//gl.drawArrays(gl.TRIANGLES, 0, vertices_count);
		}
	}
};























