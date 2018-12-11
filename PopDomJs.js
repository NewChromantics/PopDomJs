Math.Inside01 = function(x,y)
{
	return ( x>=0 && x<=1 && y>=0 && y<=1 );
}

//	uses PopMath for Rect(x,y,w,h)
function TRect(x,y,w,h)
{
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
}




function PopDom(OnChanged)
{
	OnChanged = OnChanged || function(){};
	
	//	todo: tree!
	this.Elements = [];
	this.OnChanged = OnChanged;
	this.LockedElement = null;		//	mousedown started on this element
	
	
	this.GetElement = function(Name)
	{
		return this.Elements[Name];
	}
	
	//	get accumulated rect
	this.GetElementRect = function()
	{
		let Rect = new TRect(0,0,0,0);
		let Accumulate = function(Element)
		{
			Rect.Accumulate( Element.Rect );
		}
		this.EnumElements( Accumulate );
		return Rect;
	}
	
	this.EnumElements = function(OnEnum)
	{
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
		this.Elements[Name].Rect = Rect;
		this.OnChanged();
		return this.Elements[Name];
	}
	
	//	todo: make a proper/generic "background" control?
	this.BackgroundElement = {};
	this.BackgroundElement.Rect = new TRect(0,0,1,1);
	this.BackgroundElement.Control = {};
	this.BackgroundElement.Control.OnClick = function(uv,FirstClick,Button){}
	this.BackgroundElement.Control.OnHover = function(uv){}
	this.BackgroundElement.Control.OnScroll = function(ScrollHv,uv){}
	

	this.GetElementAt = function(u,v,UseLocked)
	{
		UseLocked = (UseLocked!==false);	//	default to true
		let ResultElement = null;
		let uv = new float2(u,v);
		
		let MatchElement = function(Element,Force)
		{
			Force = (Force===true);
			let LocalUv = Element.Rect.GetLocalUv( uv );
			if ( !Force && !Math.Inside01( LocalUv.x, LocalUv.y ) )
				return;
			ResultElement = {};
			ResultElement.Element = Element;
			ResultElement.LocalUv = LocalUv;
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
	
	
	this.OnMouseDown = function(u,v)
	{
		this.LockedElement = null;
		let MatchElement = this.GetElementAt( u, v );
		this.LockedElement = MatchElement.Element;
		MatchElement.Element.Control.OnClick( MatchElement.LocalUv, true, PopFragGui.ButtonLeft );
	}

	this.OnMouseUp = function(u,v)
	{
		this.LockedElement = null;
	}

	this.OnMouseMove = function(u,v)
	{
		//	mouse down
		let MatchElement = this.GetElementAt( u, v );
		if ( this.LockedElement )
			MatchElement.Element.Control.OnClick( MatchElement.LocalUv, false, PopFragGui.ButtonLeft );
		else
			MatchElement.Element.Control.OnHover( MatchElement.LocalUv );
	}

	
}

