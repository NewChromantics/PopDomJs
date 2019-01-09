Math.Inside01 = function(x,y)
{
	return ( x>=0 && x<=1 && y>=0 && y<=1 );
}

Math.Lerp = function(Min,Max,Time)
{
	return Min + ( Time * (Max-Min) );
};



//	uses PopMath for Rect(x,y,w,h)
function TRect(x,y,w,h)
{
	if ( x instanceof TRect )
	{
		h = x.h;
		w = x.w;
		y = x.y;
		x = x.x;
	}
	
	if ( Array.isArray(x) )
	{
		h = x[3];
		w = x[2];
		y = x[1];
		x = x[0];
	}
	
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	
	this.GetArray = function()
	{
		return [this.x,this.y,this.w,this.h];
	}

	this.GetLeft = function()
	{
		return this.x;
	}
	
	this.GetTop = function()
	{
		return this.y;
	}

	this.GetBottom = function()
	{
		return this.y + this.h;
	}
	
	this.GetRight = function()
	{
		return this.x + this.w;
	}
	
	this.Accumulate = function(Rect)
	{
		this.x = Math.min( Rect.x, this.x );
		let Right = Math.max( Rect.GetRight(), this.GetRight() );
		this.w = Right - this.x;

		this.y = Math.min( Rect.y, this.y );
		let Bottom = Math.max( Rect.GetBottom(), this.GetBottom() );
		this.h = Bottom - this.y;
	}
	
	this.GetLocalUv = function(Uv)
	{
		let u = Math.Range( this.GetLeft(), this.GetRight(), Uv.x );
		let v = Math.Range( this.GetTop(), this.GetBottom(), Uv.y );
		return new float2(u,v);
	}
	
	this.ScaleTo = function(Parent)
	{
		let Normalised = this;
		let l = Math.Lerp( Parent.GetLeft(), Parent.GetRight(), Normalised.GetLeft() );
		let r = Math.Lerp( Parent.GetLeft(), Parent.GetRight(), Normalised.GetRight() );
		let t = Math.Lerp( Parent.GetTop(), Parent.GetBottom(), Normalised.GetTop() );
		let b = Math.Lerp( Parent.GetTop(), Parent.GetBottom(), Normalised.GetBottom() );
		let w = r-l;
		let h = b-t;
		return new TRect( l, t, w, h );
	}
	
	this.GetMultiplied = function(ScalarRect)
	{
		ScalarRect = new TRect( Array.from(arguments) );
		ScalarRect.x *= this.x;
		ScalarRect.y *= this.y;
		ScalarRect.w *= this.w;
		ScalarRect.h *= this.h;
		return ScalarRect;
	}
	
}



var FragShader_BasicBackground = `
precision highp float;
varying vec2 uv;

const vec3 ColourA = vec3(218, 234, 237);
const vec3 ColourB = vec3(176, 221, 229);
const float SquareSize = 20.0;
uniform vec4 BackgroundSize;

void main()
{
	float x = mod( uv.x * BackgroundSize.z, SquareSize);
	float y = mod( uv.y * BackgroundSize.w, SquareSize);
	bool xi = x < (SquareSize/2.0);
	bool yi = y < (SquareSize/2.0);
	gl_FragColor.xyz = (xi==yi) ? ColourA : ColourB;
	gl_FragColor.xyz /= 255.0;
	
	//gl_FragColor.xyz = ColourA / 255.0;
	gl_FragColor.w = 1.0;
}
`;


function PopDom(OnChanged,GetPixelRect)
{
	OnChanged = OnChanged || function(){};
	
	//	todo: tree!
	this.Elements = [];
	this.OnChanged = OnChanged;
	this.LockedElement = null;		//	mousedown started on this element
	this.GetPixelRect = GetPixelRect || function()	{	return new TRect(0,0,100,100);	};
	
	this.BackgroundElement = {};
	this.BackgroundElement.Rect = new TRect(0,0,1,1);
	this.BackgroundElement.IsBackground = true;	//	dont include in accumulate
	this.BackgroundElement.IsStatic = true;

	this.SetBackgroundUniforms = function(Shader,Geo)
	{
		Shader.SetUniform('BackgroundSize', this.GetPixelRect().GetArray() );
	}

	this.GetElement = function(Name)
	{
		if ( Name === null )
			return this.BackgroundElement;
		return this.Elements[Name];
	}
	
	//	get accumulated rect
	this.GetElementRect = function()
	{
		let Rect = new TRect(0,0,0,0);
		let Accumulate = function(Element)
		{
			if ( Element.IsBackground !== true )
				Rect.Accumulate( Element.Rect );
		}
		this.EnumElements( Accumulate, false );
		return Rect;
	}
	
	this.EnumElements = function(OnEnum)
	{
		OnEnum( this.BackgroundElement, null );
		
		//	todo: sort by Z? or let renderer deal with occlusion & effeciency
		let ElementNames = Object.keys(this.Elements);
		let OnEnumKey = function(Key)
		{
			OnEnum( this.Elements[Key], Key );
		}
		ElementNames.forEach( OnEnumKey.bind(this) );
	}
	
	this.AddElement = function(Name,Rect)
	{
		if ( this.Elements.Name !== undefined )
			throw "Duplicate element name " + Name;
		
		this.Elements[Name] = {};
		//	gr: copy the rect, as objects/arrays are references and this can be messed up externally if reused in caller etc
		this.Elements[Name].Rect = new TRect(Rect);
		this.Elements[Name].Name = Name;
		this.OnChanged();
		return this.Elements[Name];
	}
	
	this.GetElementAt = function(u,v,UseLocked,IncludeStatic)
	{
		UseLocked = (UseLocked!==false);	//	default to true
		IncludeStatic = (IncludeStatic!==false);	//	default to true
		let ResultElement = null;
		let uv = new float2(u,v);
		
		let MatchElement = function(Element,Force)
		{
			Force = (Force===true);
			let LocalUv = Element.Rect.GetLocalUv( uv );
			if ( !Force && !Math.Inside01( LocalUv.x, LocalUv.y ) )
				return;
			if ( !IncludeStatic && Element.IsStatic === true )
				return;
			ResultElement = {};
			ResultElement.Element = Element;
			ResultElement.LocalUv = [LocalUv.x,LocalUv.y];
		}
		
		if ( UseLocked && this.LockedElement )
		{
			MatchElement( this.LockedElement, true );
		}
		else
		{
			this.EnumElements( MatchElement );
		}
		if ( !ResultElement )
			MatchElement( this.BackgroundElement, true );
		
		return ResultElement;
	}
	
	
	this.OnMouseDown = function(x,y,ButtonIndex)
	{
		let WindowRect = GetPixelRect();
		let u = x / WindowRect.w;
		let v = y / WindowRect.h;
	
		this.LockedElement = null;
		let IncludeStatic = false;
		let MatchElement = this.GetElementAt( u, v, true, IncludeStatic );
		this.LockedElement = MatchElement.Element;
		MatchElement.Element.Control.OnClick( MatchElement.LocalUv, true, ButtonIndex );
	}

	this.OnMouseUp = function(x,y,ButtonIndex)
	{
		this.LockedElement = null;
	}

	this.OnMouseMove = function(x,y,ButtonIndex)
	{
		let WindowRect = GetPixelRect();
		let u = x / WindowRect.w;
		let v = y / WindowRect.h;
		
		//	mouse down
		let IncludeStatic = false;
		let MatchElement = this.GetElementAt( u, v, true, IncludeStatic );
		if ( !MatchElement )
			return;
		if ( this.LockedElement )
			MatchElement.Element.Control.OnClick( MatchElement.LocalUv, false, ButtonIndex );
		else
			MatchElement.Element.Control.OnHover( MatchElement.LocalUv );
	}

	
	TFragGui.CurrentDom = this;
	let bec = new TShaderBox( null, FragShader_BasicBackground, this.SetBackgroundUniforms.bind(this) );

}

