'use strict';

var MagoRenderable = function(options) 
{
	this.objectsArray = [];

	this.id;
	this.name;
	this.owner;

	this.attributes = {
		isVisible: true
	};
	// Use this matrix if this is child.
	this.tMat;
	this.tMatOriginal;

	// use this geoLocDataManager if this is no child.
	this.geoLocDataManager;
	
	this.dirty = true;
	this.color4;
	this.wireframeColor4;
	this.selectedColor4;

	this.eventObject = {};
	
	this.options = options;
	if (options !== undefined)
	{
		if (options.color && options.color instanceof Color) 
		{
			this.color4 = options.color;
		}
	}
};

MagoRenderable.EVENT_TYPE = {
	'RENDER_END'   : 'renderEnd',
	'RENDER_START' : 'renderStart',
	'MOVE_END'     : 'moveEnd',
	'MOVE_START'   : 'moveStart'
};
/**
 * 이벤트 등록
 * @param {MagoEvent} event 
 */
MagoRenderable.prototype.addEventListener = function(event) 
{
	if (!event instanceof MagoEvent) 
	{
		throw new Error('args event must MagoEvent!');
	}

	var type = event.getType();

	if (!MagoRenderable.EVENT_TYPE[type]) 
	{
		throw new Error('this type is not support.');
	}

	if (!this.eventObject[type]) 
	{
		this.eventObject[type] = [];
	}

	this.eventObject[type].push(event);
};
/**
 * 이벤트 실행
 * @param {String} type 
 */
MagoRenderable.prototype.dispatchEvent = function(type, magoManager) 
{
	if (!MagoRenderable.EVENT_TYPE[type]) 
	{
		throw new Error('this type is not support.');
	}

	var events = this.eventObject[type];

	if (!events || !Array.isArray(events)) { return; } 
	
	for (var i=0, len=events.length;i<len;i++) 
	{
		var event = events[i];
		var listener = event.getListener();
		if (typeof listener === 'function') 
		{
			listener.apply(this, [this, magoManager]);
		}
	}
};
MagoRenderable.prototype.getRootOwner = function() 
{
	if (this.owner === undefined)
	{ return this; }
	else 
	{
		return this.owner.getRootOwner();
	}
};

MagoRenderable.prototype.getObject = function(idx) 
{
	if (idx > this.objectsArray.length-1) 
	{
		throw new Error('out of bound range.');
		//return undefined;
	}

	return this.objectsArray[idx];
};

MagoRenderable.prototype.render = function(magoManager, shader, renderType, glPrimitive, bIsSelected) 
{
	if (this.attributes) 
	{
		if (this.attributes.isVisible !== undefined && this.attributes.isVisible === false) 
		{
			return;
		}
		
		if (renderType === 2)
		{
			if (this.attributes.isSelectable !== undefined && this.attributes.isSelectable === false) 
			{
				return;
			}
		}
	}
	

	if (this.dirty)
	{ this.makeMesh(); }
	
	if (this.objectsArray.length === 0)
	{ return false; }

	// Set geoLocation uniforms.***
	var gl = magoManager.getGl();
	var buildingGeoLocation = this.geoLocDataManager.getCurrentGeoLocationData();
	buildingGeoLocation.bindGeoLocationUniforms(gl, shader); // rotMatrix, positionHIGH, positionLOW.
	
	this.renderAsChild(magoManager, shader, renderType, glPrimitive, bIsSelected, this.options);
	
	// check options provisionally here.
	if (this.options)
	{
		if (this.options.renderWireframe)
		{
			var shaderThickLine = magoManager.postFxShadersManager.getShader("thickLine");
			shaderThickLine.useProgram();
			shaderThickLine.bindUniformGenerals();
			var gl = magoManager.getGl();

			gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
			gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			gl.disable(gl.CULL_FACE);
			
			gl.enableVertexAttribArray(shaderThickLine.prev_loc);
			gl.enableVertexAttribArray(shaderThickLine.current_loc);
			gl.enableVertexAttribArray(shaderThickLine.next_loc);
			
			var geoLocData = this.geoLocDataManager.getCurrentGeoLocationData();
			geoLocData.bindGeoLocationUniforms(gl, shaderThickLine);

			var sceneState = magoManager.sceneState;
			var drawingBufferWidth = sceneState.drawingBufferWidth;
			var drawingBufferHeight = sceneState.drawingBufferHeight;
			if (this.wireframeColor4)
			{ gl.uniform4fv(shaderThickLine.color_loc, [this.wireframeColor4.r, this.wireframeColor4.g, this.wireframeColor4.b, this.wireframeColor4.a]); }
			else
			{ gl.uniform4fv(shaderThickLine.color_loc, [0.6, 0.8, 0.9, 1.0]); }
			gl.uniform2fv(shaderThickLine.viewport_loc, [drawingBufferWidth[0], drawingBufferHeight[0]]);

			this.renderAsChild(magoManager, shaderThickLine, renderType, glPrimitive, bIsSelected, this.options);
			
			// Return to the currentShader.
			shader.useProgram();
		}
	}
};

MagoRenderable.prototype.renderAsChild = function(magoManager, shader, renderType, glPrimitive, bIsSelected, options) 
{
	if (this.dirty)
	{ this.makeMesh(); }

	// Set geoLocation uniforms.***
	var gl = magoManager.getGl();
	
	if (renderType === 0)
	{
		// Depth render.***
	}
	else if (renderType === 1)
	{
		// Color render.***
		gl.enable(gl.BLEND);
		gl.uniform1i(shader.colorType_loc, 0); // 0= oneColor, 1= attribColor, 2= texture.***
		
		// Check if is selected.***
		var selectionManager = magoManager.selectionManager;
		
		if (bIsSelected !== undefined && bIsSelected)
		{
			var color = this.selectedColor4 ? this.selectedColor4 : this.color4;
			if (color) 
			{
				gl.uniform4fv(shader.oneColor4_loc, [color.r, color.g, color.b, color.a]);
			}
		}
		else if (selectionManager.isObjectSelected(this))
		{
			bIsSelected = true;
			var selColor = [0.9, 0.1, 0.1, 1.0];
			if (this.attributes.selectedColor4)
			{
				var selectedColor = this.attributes.selectedColor4;
				selColor = [selectedColor.r, selectedColor.g, selectedColor.b, selectedColor.a];
			}
			
			gl.uniform4fv(shader.oneColor4_loc, selColor);
		}
		else 
		{
			if (this.color4) 
			{
				gl.uniform4fv(shader.oneColor4_loc, [this.color4.r, this.color4.g, this.color4.b, this.color4.a]);
			}
		}
	}
	else if (renderType === 2)
	{
		// Selection render.***
		var selectionColor = magoManager.selectionColor;
		var colorAux = selectionColor.getAvailableColor(undefined);
		var idxKey = selectionColor.decodeColor3(colorAux.r, colorAux.g, colorAux.b);
		magoManager.selectionManager.setCandidateGeneral(idxKey, this);
		
		gl.uniform4fv(shader.oneColor4_loc, [colorAux.r/255.0, colorAux.g/255.0, colorAux.b/255.0, 1.0]);
		gl.disable(gl.BLEND);
	}

	if (this.tMat) 
	{
		gl.uniformMatrix4fv(shader.buildingRotMatrix_loc, false, this.tMat._floatArrays);
	}
	
	var objectsCount = this.objectsArray.length;
	
	for (var i=0; i<objectsCount; i++)
	{
		this.objectsArray[i].renderAsChild(magoManager, shader, renderType, glPrimitive, bIsSelected, options);
	}

	gl.disable(gl.BLEND);

	this.dispatchEvent('RENDER_END', magoManager);
};

MagoRenderable.prototype.makeMesh = function() 
{
	return abstract();
};

MagoRenderable.prototype.moved = function() 
{
	// do something.
};

MagoRenderable.prototype.updateMatrix = function(ownerMatrix) 
{
	if (!ownerMatrix) 
	{
		if (this.geoLocDataManager === undefined || this.geoLocDataManager === null) 
		{
			return;
		}

		var geoLocDataManager = this.geoLocDataManager;
		var geoLocData = geoLocDataManager.getCurrentGeoLocationData();
		this.tMat = geoLocData.rotMatrix;
	}
	else 
	{
		this.tMat = this.tMatOriginal.getMultipliedByMatrix(ownerMatrix, this.tMat);
	}
    
	if (this.objectsArray === undefined)
	{ return; }
	for (var i=0, len=this.objectsArray.length; i <len;++i) 
	{
		var object = this.objectsArray[i];
		if (object instanceof MagoRenderable)
		{
			this.objectsArray[i].updateMatrix(this.tMat);
		}
	}
};
MagoRenderable.prototype.setDirty = function(dirty) 
{
	this.dirty = dirty;
};
/**
 * Set the unique one color of the box
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b 
 * @param {Number} a
 */
MagoRenderable.prototype.setOneColor = function(r, g, b, a)
{
	// This function sets the unique one color of the mesh.***
	if (this.color4 === undefined)
	{ this.color4 = new Color(); }
	
	this.color4.setRGBA(r, g, b, a);

	//TODO : 좀 더 정교한 근사값 구하기로 변경
	if (a < 1) 
	{
		this.setOpaque(false);
	}
};
/**
 * Set the unique one color of the box
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b 
 * @param {Number} a
 */
MagoRenderable.prototype.setWireframeColor = function(r, g, b, a)
{
	// This function sets the unique one color of the mesh.***
	if (this.wireframeColor4 === undefined)
	{ this.wireframeColor4 = new Color(); }
	
	this.wireframeColor4.setRGBA(r, g, b, a);

	//TODO : 좀 더 정교한 근사값 구하기로 변경
	if (a < 1) 
	{
		this.setOpaque(false);
	}
};

MagoRenderable.prototype.setOpaque = function(opaque)
{
	this.attributes.opaque = opaque;
};
MagoRenderable.prototype.isOpaque = function()
{
	if (this.attributes.opaque === undefined) 
	{
		return true;
	}

	return this.attributes.opaque;
};
MagoRenderable.prototype.getGeoLocDataManager = function()
{
	return this.geoLocDataManager;
};