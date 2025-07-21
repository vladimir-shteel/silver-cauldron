<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class setup_controller extends Banshee\controller {
		public function execute() {
			if (is_false(DEBUG_MODE)) {
				$this->view->add_tag("denied");
				return;
			}

			if ($_SERVER["HTTP_SCHEME"] != "https") {
				$this->view->add_system_warning("Be aware! Your connection is not secured by SSL/TLS.");
			}

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Create database") {
					$this->model->create_database($_POST["username"], $_POST["password"]);
				} else if ($_POST["submit_button"] == "Import SQL") {
					$this->model->import_sql();
				} else if ($_POST["submit_button"] == "Update database") {
					$this->model->update_database();
					$this->model->import_inserts(UPDATE_TABLES);
				} else if ($_POST["submit_button"] == "Set password") {
					$this->model->set_admin_credentials($_POST["username"], $_POST["password"], $_POST["repeat"]);
				} else if ($_POST["submit_button"] == "Create directories") {
					$this->model->create_directories();
				}
			}

			$step = $this->model->step_to_take();
			$this->view->open_tag($step);
			switch ($step) {
				case "php_extensions":
					$missing = $this->model->missing_php_extensions();
					foreach ($this->model->missing_php_extensions() as $extension) {
						$this->view->add_tag("extension", $extension);
					}
					ob_clean();
					break;
				case "db_settings":
					$this->model->remove_database_errors();
					break;
				case "create_db":
					$this->model->remove_database_errors();
					$username = isset($_POST["username"]) ? $_POST["username"] : "root";
					$this->view->add_tag("username", $username);
					$this->view->run_javascript("document.getElementById('password').focus()");
					break;
				case "import_sql":
					ob_clean();
					break;
				case "update_db":
					ob_clean();
					break;
				case "create_dirs":
					ob_clean();
					break;
				case "credentials":
					if ($_POST["submit_button"] != "Set password") {
						$_POST["username"] = "admin";
					}
					$this->view->add_tag("username", $_POST["username"]);
					ob_clean();
					break;
				case "done":
					ob_clean();
					break;
			}
			$this->view->close_tag();
		}
	}
?>
