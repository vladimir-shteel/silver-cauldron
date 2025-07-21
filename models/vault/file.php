<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class vault_file_model extends Banshee\model {
        protected $max_capacity = false;

		private function filename_okay($file) {
			if (trim($file) == "") {
				return false;
			}

			if (substr($file, 0, 1) == ".") {
				return false;
			}

			$valid_extensions = array(ALLOWED_UPLOADS, MAP_IMAGE_EXTENSIONS, MAP_VIDEO_EXTENSIONS);
			$valid_extensions = implode("|", $valid_extensions);
			$valid_extensions = explode("|", $valid_extensions);

			$extension = array_pop(explode(".", $file));

			if (in_array($extension, $valid_extensions) == false) {
				return false;
			}

			return valid_input($file, VALIDATE_NUMBERS.VALIDATE_LETTERS."-_.& ");
		}

		private function dirname_okay($file) {
			return valid_input($file, VALIDATE_NUMBERS.VALIDATE_LETTERS."-_", VALIDATE_NONEMPTY);
		}

		public function valid_path($path) {
			if (strpos($path, "//") !== false) {
				return false;
			}

			return valid_input($path, VALIDATE_NUMBERS.VALIDATE_LETTERS."-_/", VALIDATE_NONEMPTY);
		}

		public function directory_listing($directory) {
			if (($dp = opendir($directory)) == false) {
				return false;
			}

			$files = $dirs = array();
			while (($file = readdir($dp)) !== false) {
				if ($file[0] == ".") {
					continue;
				}
				if (is_dir($directory."/".$file)) {
					array_push($dirs, $file);
				} else {
					array_push($files, $file);
				}
			}

			closedir($dp);

			sort($files);
			sort($dirs);

			return array(
				"dirs"  => $dirs,
				"files" => $files);
		}

		public function get_file_size($file) {
			if (($size = filesize($file)) === false) {
				return false;
			}

			if ($size > MB) {
				return sprintf("%.2f MB", $size / MB);
			} else if ($size > 1024) {
				return sprintf("%.2f kB", $size / 1024);
			}

			return $size." byte";
		}

		public function get_directory_size($directory) {
			if (($dp = opendir($directory)) == false) {
				return false;
			}

			$result = 0;

			while (($file = readdir($dp)) != false) {
				if (($file == ".") || ($file == "..")) {
					continue;
				}

				$path = $directory."/".$file;
				if (is_dir($path)) {
					$result += $this->get_directory_size($path);
				} else if (($size = filesize($path)) !== false) {
					$result += $size;
				}
			}

			closedir($dp);

			return $result;
		}

		public function upload_okay($file, $directory, $exists_warning = null) {
			if ($file["error"] !== 0) {
				$this->view->add_system_warning("Error while uploading file.");
				return false;
			}

			if ($this->filename_okay($file["name"]) == false) {
				$this->view->add_message("Invalid filename.");
				return false;
			}

			if (($ext = strrchr($file["name"], ".")) === false) {
				$this->view->add_message("File has no extension.");
				return false;
			}

			$allowed_extensions = array_merge(
				config_array(ALLOWED_UPLOADS),
				config_array(MAP_IMAGE_EXTENSIONS),
				config_array(MAP_VIDEO_EXTENSIONS));
			if (in_array(substr(strtolower($ext), 1), $allowed_extensions) == false) {
				$this->view->add_message("Invalid file extension.");
				return false;
			}

			if (file_exists($directory."/".$file["name"])) {
				if ($exists_warning == null) {
					$exists_warning = "File already exists.";
				}
				$this->view->add_message($exists_warning);
				return false;
			}

			if ($this->max_capacity && ($this->user->max_resources > 0)) {
				$max_capacity = $this->user->max_resources * MB;
				$capacity = $this->get_directory_size("resources/".$this->user->resources_key);

				if ($capacity + filesize($file["tmp_name"]) > $max_capacity) {
					$this->view->add_message("This file is too big for your maximum capacity (%s MB).", $this->user->max_resources);
					return false;
				}
			}

			return true;
		}

		public function import_uploaded_file($file, $directory) {
			return move_uploaded_file($file["tmp_name"], $directory."/".$file["name"]);
		}

		public function rename_file($current, $new, $directory) {
			if ($this->filename_okay($current) == false) {
				return false;
			}

			if ($this->filename_okay($new) == false) {
				return false;
			}

			$r_current = $directory."/".$current;
			$r_new = $directory."/".$new;

			if (is_dir($r_current)) {
				if ($this->dirname_okay($current) == false) {
					return false;
				}

				if ($this->dirname_okay($new) == false) {
					return false;
				}
			}

			return rename($r_current, $r_new);
		}

		public function delete_file($file, $directory) {
			if ($this->filename_okay($file) == false) {
				return false;
			}
			$file = $directory."/".$file;

			ob_start();
			$result = is_dir($file) ? @rmdir($file) : @unlink($file);
			ob_end_clean();

			return $result;
		}

		public function directory_empty($subdir, $directory) {
			if (($dp = opendir($directory."/".$subdir)) == false) {
				return false;
			}

			$result = true;
			$allowed = array(".", "..");
			while (($file = readdir($dp)) !== false) {
				if (in_array($file, $allowed) == false) {
					$result = false;
					break;
				}
			}
			closedir($dp);

			return $result;
		}

		public function directory_okay($subdir, $directory) {
			$result = true;

			if ($this->dirname_okay($subdir) == false) {
				$this->view->add_message("Invalid directory name.");
				$result = false;
			} else if (file_exists($directory."/".$subdir)) {
				$this->view->add_message("Directory already exists.");
				$result = false;
			}

			return $result;
		}

		public function create_directory($subdir, $directory) {
			return @mkdir($directory."/".$subdir);
		}

		public function save_file($file, $content, $directory) {
			if ($this->filename_okay($file) == false) {
				return false;
			}

			if (($fp = fopen($directory."/".$file, "w")) == false) {
				return false;
			}

			fputs($fp, $content);

			fclose($fp);

			return true;
		}
	}
?>
