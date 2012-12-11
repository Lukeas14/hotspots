/*****************************
 * hotspots.js jQuery Plugin
 * Version: 1.0
 * Original Author: Justin Lucas
 * Copyright 2012 Justin Lucas
 * Licensed under MIT License
 ****************************/

;(function( $, window, document, undefined ){

	var dotMap = function(elem, options, instance_count){
		this.$elem = $(elem),
		this.elem_offset;
		this.$default_content = null;
		this.options = options;
		this.instance_count = instance_count;
		this.points = {};
		this.total_points = 0;
		this.current_point = 0;
		this.selected_point = null;
		this.point_id_prefix = "dotMap_" + this.instance_count + "_point_";
		this.point_dot_class = "dotMap_" + this.instance_count + "_point_dot";
		this.point_circle_class = "dotMap_" + this.instance_count + "_point_circle";
		this.content_class = "dotMap_" + this.instance_count + "_content"
	};

	dotMap.prototype = {

		init: function(){
			//load parent element into plugin
			this._parse_elements();

			//load points into plugin
			this._parse_points();

			//start calculating point offsets
			this._calculate_offsets();

			//begin detecting mouseovers/clicks
			this._detect_mouse();
		},

		/*
		 * create point dot element
		 */
		point_dot: function(point){
			return $("<div>")
				.attr('id', this.point_id_prefix + point.id)
				.addClass(this.point_dot_class)
				.css({
					position: 'absolute',
					top: (point.y - 3),
					left: (point.x - 3),
					width: '4px',
					height: '4px',
					background: this.options.point_color,
					'z-index': 10,
					'border-radius': '50%',
				});
		},

		/*
		 * create point circle element
		 */
		point_circle: function(point){
			return $("<div>")
				.attr('id', this.point_id_prefix + point.id)
				.addClass(this.point_circle_class)
				.css({
					position: 'absolute',
					top: point.y,
					left: point.x,
					width: '0px',
					height: '0px',
					background: this.options.point_color,
					'border-radius': '50%'
				});
		},

		_parse_elements: function(){
			//Get parent element's offset from page
			this.elem_offset = this.$elem.offset();

			//Set parent element to nonstatic position value
			if(this.$elem.css('position') === "static"){
				this.$elem.css({ position: 'relative' });
			}

			//Does default_content element exist?
			if(this.options.default_content_id !== null && this.options.default_content_id.length > 0){
				this.$default_content = $("#" + this.options.default_content_id);
				if(!this.$default_content.length){
					this.$default_content = null;
				}
				else{
					this.$default_content.addClass(this.content_class);
				}
			}
		},

		_parse_points: function(){
			for(i in this.options.points){
				//Make sure point has x,y coordinates
				if(
					typeof(this.options.points[i].x) !== "number"
					|| this.options.points[i].x < 0
					|| typeof(this.options.points[i].y) !== "number"
					|| this.options.points[i].y < 0
				){
					continue;
				}

				var point = this.points[this.total_points] = this.options.points[i];

				//Use the current total points as the point id and index
				point.id = this.total_points;

				//draw points inside parent element
				this.$elem.append(this.point_dot(point), this.point_circle(point));

				//save point elements inside point object
				point.$point_dot = this.$elem.children("." + this.point_dot_class + "#" + this.point_id_prefix + point.id);
				point.$point_circle = this.$elem.children("." + this.point_circle_class + "#" + this.point_id_prefix + point.id);
				point.$point = point.$point_dot.add(point.$point_circle);

				//calculate mouseover/click radius for each point
				this._calculate_point_radius(point.id);

				if(typeof(point.content_id) !== "undefined" && point.content_id.length > 0){
					$point_content = $("#" + point.content_id);

					if($point_content.length){
						//save jQuery content element
						point.$content = $point_content;

						//add 'dots_content' class to it
						$point_content.addClass(this.content_class);
					}
				}

				//Increment the total number of points
				this.total_points++;
			}

			this._pulsate_circle();
		},

		_calculate_offsets: function(){
			var self = this;

			this.$elem.mouseenter(function(){
				var elem_offset = self.$elem.offset();
				if(self.elem_offset.top !== elem_offset.top || self.elem_offset.left !== elem_offset.left){
					self.elem_offset = elem_offset;
					$.each(self.points, function(point_id, point){
						self._calculate_point_radius(point_id);
					});
				}
			});
		},

		_calculate_point_radius: function(point_id){
			var point = this.points[point_id];

			point.x1 = ((point.x + this.elem_offset.left) - this.options.radius);
			point.x2 = ((point.x + this.elem_offset.left) + this.options.radius);
			point.y1 = ((point.y + this.elem_offset.top) - this.options.radius);
			point.y2 = ((point.y + this.elem_offset.top) + this.options.radius);
		},

		_detect_mouse: function(){
			var self = this;

			this.$elem.mousemove(function(e){
				if(self.$default_content === null || self.selected_point === null){
					$.each(self.points, function(point_id, point){
						
						if(self.selected_point !== point.id){
							if(
								e.pageX > point.x1 
								&& e.pageY > point.y1 
								&& e.pageX < point.x2 
								&& e.pageY < point.y2
							){
								self._select_point(point.id);
							}
						}
					});
				}
				else{
					var point = self.points[self.selected_point];
					if(
						e.pageX < point.x1 
						|| e.pageY < point.y1 
						|| e.pageX > point.x2 
						|| e.pageY > point.y2
					){
						self._unselect_point(self.selected_point);
					}
				}
			});
		},

		_select_point: function(point_id){
			var point = this.points[point_id];

			//Unselect any selected points
			if(this.selected_point !== null){
				this._unselect_point(this.selected_point);
			}

			this.selected_point = point.id;

			//hide any visible content elements
			$("." + this.content_class + ":visible").stop(true, true).fadeOut(this.options.fade_duration, function(){
				//show this point's content element
				if(typeof(point.$content) !== "undefined"){
					point.$content.fadeIn();
				}
			});

			//mark point as selected
			point.$point.css({
				background: this.options.selected_point_color
			});
			point.$point_circle.stop(true).css({
				width: (this.options.radius * 2) + "px",
				height: (this.options.radius * 2) + "px",
				left: (point.x - this.options.radius),
				top: (point.y - this.options.radius),
				opacity: 0.5
			})

			//launch select_point callback
			if(typeof(this.options.select_point_callback) == "function"){
				this.options.select_point_callback(point);
			}
		},

		_unselect_point: function(point_id){
			var self = this,
				point = this.points[point_id];

			this.selected_point = null;

			//hide any visible content elements
			$("." + this.content_class + ":visible").stop(true, true).fadeOut((this.options.fade_duration * 4), function(){
				//show default content if it exists
				if(self.$default_content !== null && self.selected_point === null){
					self.$default_content.fadeIn(self.options.fade_duration);
				}
			});

			//mark point as unselected
			point.$point_circle.animate({
				opacity:0
			}, this.fade_duration, function(){
				point.$point.css({background: self.options.point_color});
			});
		},

		_pulsate_circle: function(){
			var self = this,
				point = this.points[this.current_point];

			if(this.selected_point !== point.id){
				point.$point_circle.animate({
					width: (this.options.radius * 2),
					height: (this.options.radius * 2),
					left: (point.x - this.options.radius),
					top: (point.y - this.options.radius),
					opacity: 0
				}, 1400, function(){
					if(this.selected_point !== point.id){
						point.$point_circle.css({
							width: '0px',
							height: '0px',
							left: point.x,
							top: point.y,
							opacity: 1
						});
					}
				});
			}

			if(this.current_point >= (this.total_points - 1)){
				this.current_point = 0;
			}
			else{
				this.current_point++;
			}

			setTimeout(function(){
				self._pulsate_circle();
			}, 400);
		}
	};

	$.fn.dotMap = function(options){
		var options = $.extend({}, $.fn.dotMap.defaults, options);

		//instance count
		$.fn.dotMap.instance_count++;

		return this.each(function(){
			new dotMap(this, options, $.fn.dotMap.instance_count).init();
		});
	};

	$.fn.dotMap.defaults = {
		points: [],
		border: "1px solid #DD0000",
		point_color: "#DD0000",
		selected_point_color: "#069900",
		radius: 30, //in pixels
		fade_duration: 250,
		select_event: 'mouseover',
		default_content_id: null,
		select_event_callback: null,
		point_selection_callback: null,
		content_switch_callback: null,
		error_callback: null
	};

	$.fn.dotMap.instance_count = 0;

})( jQuery );