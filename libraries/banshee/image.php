<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	class image {
		public $resource = null;
		protected $load_image = null;
		protected $save_image = null;
		protected $mime_type = null;
		protected $filename = null;
		private $width = null;
		private $height = null;

		/* Constructor
		 *
		 * INPUT:  string filename or image string
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($image) {
			if (substr($image, -4) == ".gif") {
				$this->set_image_format("gif");
				$this->load($image);
				return;
			} else if ((substr($image, -4) == ".jpg") || (substr($image, -5) == ".jpeg")) {
				$this->set_image_format("jpeg");
				$this->load($image);
				return;
			} else if (substr($image, -4) == ".png") {
				$this->set_image_format("png");
				$this->load($image);
				return;
			} else if (substr($image, -5) == ".webp") {
				$this->set_image_format("webp");
				$this->load($image);
				return;
			} else if (file_exists($image)) {
				$image = file_get_contents($image);
			}

			if (substr($image, 0, 6) == "GIF89a") {
				$this->set_image_format("gif");
				$this->from_string($image);
			} else if (substr($image, 0, 3) == "\xFF\xD8\xFF") {
				$this->set_image_format("jpeg");
				$this->from_string($image);
			} else if (substr($image, 1, 3) == "PNG") {
				$this->set_image_format("png");
				$this->from_string($image);
			} else if (substr($image, 8, 4) == "WEBP") {
				$this->set_image_format("webp");
				$this->from_string($image);
			}
		}

		/* Destructor
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __destruct() {
		}

		/* Set image format
		 *
		 * INPUT:  string gif|jpeg|png
		 * OUTPUT: -
		 * ERROR:  -
		 */
		private function set_image_format($format) {
			$this->load_image = "imagecreatefrom".$format;
			$this->save_image = "image".$format;
			$this->mime_type  = "image/".$format;
		}

		/* Magic method get
		 *
		 * INPUT:  string key
		 * OUTPUT: mixed value
		 * ERROR:  null
		 */
		public function __get($key) {
			if ($this->resource === null) {
				return null;
			}

			switch ($key) {
				case "loaded": return $this->resource !== null;
				case "width": return $this->width;
				case "height": return $this->height;
			}

			return null;
		}

		/* Load image
		 *
		 * INPUT:  string filename
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function load($filename) {
			if (file_exists($filename) == false) {
				return false;
			} else if (($resource = call_user_func($this->load_image, $filename)) === false) {
				return false;
			}

			$this->resource = $resource;
			$this->filename = $filename;
			$this->update_size();

			return true;
		}

		/* Save image
		 *
		 * INPUT:  string filename
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function save($filename = null) {
			if ($this->resource === null) {
				return false;
			}

			if ($filename === null) {
				$filename = $this->filename;
			}

			imagesavealpha($this->resource, true);

			return call_user_func($this->save_image, $this->resource, $filename);
		}

		/* Image from string
		 *
		 * INPUT:  string image
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function from_string($image) {
			if (($resource = imagecreatefromstring($image)) === false) {
				return false;
			}

			$this->resource = $resource;
			$this->update_size();

			return true;
		}

		/* Update image size information
		 *
		 * INPUT:  -
		 * OUTPUT: true
		 * ERROR:  false
		 */
		private function update_size() {
			if ($this->resource === null) {
				return false;
			}

			$this->width = imagesx($this->resource);
			$this->height = imagesy($this->resource);

			return true;
		}

		/* Resize image
		 *
		 * input:  int new height[, int max new width]
		 * output: true
		 * error:  false
		 */
		public function resize($height, $max_width = null) {
			if ($this->resource === null) {
				return false;
			}

			$width = ($this->width * $height) / $this->height;
			$width = round($width, 0);

			if (($max_width !== null) && ($width > $max_width)) {
				$width = $max_width;
				$height = ($this->height * $width) / $this->width;
				$height = round($height, 0);
			}

			if (($resource = imagecreatetruecolor($width, $height)) == false) {
				return false;
			}
			if (imagecopyresampled($resource, $this->resource, 0, 0, 0, 0, $width, $height, $this->width, $this->height) == false) {
				return false;
			}

			$this->resource = $resource;
			$this->update_size();

			return true;
		}

		/* Rotate image
		 *
		 * input:  int new angle[, int background color]
		 * output: true
		 * error:  false
		 */
		public function rotate($angle, $bgcolor = null) {
			if ($this->resource === null) {
				return false;
			}

			if ($bgcolor === null) {
				$bgcolor = imagecolorallocatealpha($this->resource, 0, 0, 0, 127);
			}

			if (($resource = imagerotate($this->resource, $angle, $bgcolor)) == false) {
				return false;
			}

			$this->resource = $resource;
			$this->update_size();

			return true;
		}

		/* Crop an image
		 *
		 * INPUT:  int x, int y, int width, int height
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function crop($x, $y, $width, $height) {
			$cropped = imagecreatetruecolor($width, $height);
			if (imagecopy($cropped, $this->resource, 0, 0, $x, $y, $width, $height) == false) {
				return false;
			}

			$this->resource = $cropped;
			$this->update_size();

			return true;
		}

		/* Send image to client
		 *
		 * INPUT:  object view
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function to_output($view = null) {
			if (headers_sent()) {
				return false;
			}

			if ($this->resource == null) {
				return false;
			}

			if ($view != null) {
				$view->disable();
			}

			header("Content-Type: ".$this->mime_type);
			return call_user_func($this->save_image, $this->resource);
		}
	}
?>
