<?php
	class vault_token_controller extends Banshee\controller {
		private function show_overview() {
			if (($tokens = $this->model->get_tokens()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->add_javascript("vault/token_list.js");

			$this->view->open_tag("overview");

			$this->view->open_tag("tokens");
			foreach ($tokens as $token) {
				$token["shape_change"] = show_boolean($token["shape_change"]);
				$this->view->record($token, "token");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_token_form($token) {
			$token["shape_change"] = show_boolean($token["shape_change"] ?? false);

			if (isset($token["id"]) == false) {
				$this->view->add_javascript("vault/token_new.js");
			}

			$this->view->add_javascript("vault/token_edit.js");

			if (isset($token["type"]) == false) {
				$token["type"] = $token["type_backup"];
			}

			$this->view->open_tag("edit");
			$this->view->record($token, "token");
			$this->view->close_tag();
		}

		private function show_archive_form($archive) {
			$this->view->open_tag("archive");
			$this->view->record($archive, "archive");
			$this->view->close_tag();
		}

		public function execute() {
			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Save token") {
					/* Save token
					 */
					if ($_FILES["image"]["error"] == 0) {
						list(, $extension) = explode("/", $_FILES["image"]["type"], 2);
						$_FILES["image"]["extension"] = $extension;
					}

					if ($this->model->save_okay($_POST, $_FILES["image"]) == false) {
						$this->show_token_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create token
						 */
						if ($this->model->create_token($_POST, $_FILES["image"]) === false) {
							$this->view->add_message("Error creating token. Possibly, the token's image extension is wrong (.jpg instead of .webp).");
							$this->show_token_form($_POST);
						} else {
							$this->user->log_action("token %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update token
						 */
						if ($this->model->update_token($_POST, $_FILES["image"]) === false) {
							$this->view->add_message("Error updating token.");
							$this->show_token_form($_POST);
						} else {
							$this->user->log_action("token %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Upload archive") {
					/* Archive
					 */
					if ($this->model->archive_okay($_FILES["archive"], $_POST) == false) {
						$this->show_archive_form($_POST);
					} else if ($this->model->process_archive($_FILES["archive"], $_POST) == false) {
						$this->view->add_message("Error processing archive.");
						$this->show_archive_form($_POST);
					} else {
						$this->user->log_action("token archive uploaded");
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "Delete token") {
					/* Delete token
					 */
					if ($this->model->delete_okay($_POST) == false) {
						$this->show_token_form($_POST);
					} else if ($this->model->delete_token($_POST["id"]) === false) {
						$this->view->add_message("Error deleting token.");
						$this->show_token_form($_POST);
					} else {
						$this->user->log_action("token %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "search") {
					/* Search
					 */
					$_SESSION["token_search"] = $_POST["search"];
					$this->show_overview();
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "new")) {
				/* New token
				 */
				$token = array(
					"width"       => 1,
					"height"      => 1,
					"type"        => "portrait",
					"armor_class" => TOKEN_DEFAULT_AC,
					"hitpoints"   => TOKEN_DEFAULT_HP);
				$this->show_token_form($token);
			} else if ($this->page->parameter_value(0, "archive")) {
				$archive = array(
					"type"        => "portrait");
				$this->show_archive_form($archive);
			} else if ($this->page->parameter_numeric(0)) {
				/* Edit token
				 */
				if (($token = $this->model->get_token($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "Token not found.");
				} else {
					$this->show_token_form($token);
				}
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
