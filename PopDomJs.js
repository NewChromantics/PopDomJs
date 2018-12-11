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
}




function PopDom(OnChanged)
{
	OnChanged = OnChanged || function(){};
	
	//	todo: tree!
	this.Elements = [];
	this.OnChanged = OnChanged;
	
	
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
	
}

