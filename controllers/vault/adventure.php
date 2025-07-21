<?php
	class vault_adventure_controller extends Banshee\controller {
		private function show_overview() {
			if (($adventures = $this->model->get_adventures()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->open_tag("overview", array("market" => show_boolean(ENABLE_MARKET)));

			$adventure_access_levels = array("DM", "Players", "Spectators");

			$this->view->open_tag("adventures");
			foreach ($adventures as $adventure) {
				$adventure["access"] = $adventure_access_levels[$adventure["access"]];
				$this->view->record($adventure, "adventure");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_adventure_form($adventure) {
			$this->view->add_javascript("vault/adventure.js");

			$this->view->open_tag("edit");

			$adventure_access_levels = array("Dungeon Master only", "Dungeon Master and players", "Dungeon Master, players and spectators");
			$this->view->open_tag("access");
			foreach ($adventure_access_levels as $level => $label) {
				$this->view->add_tag("level", $label, array("value" => $level));
			}
			$this->view->close_tag();

			$this->view->record($adventure, "adventure");

			$this->view->close_tag();
		}

		private function show_market() {
			$this->view->title = "Adventure market";
			$this->view->add_javascript("vault/market.js");

			$adventures = $this->model->get_market();

			$this->view->open_tag("market");
			foreach ($adventures as $adventure) {
				$adventure["summary"] = explode("\\n", $adventure["summary"]);
				$this->view->record($adventure, "adventure", array(), true);
			}
			$this->view->close_tag();
		}

		private function show_adventure_token_selector($adventure) {
			if (($library = $this->model->get_tokens()) == false) {
				return false;
			}

			if (($placed = $this->model->get_placed_tokens($_POST["adventure"])) == false) {
				return false;
			}

			$this->view->open_tag("token_selector");
			$this->view->add_tag("adventure", $adventure);

			$this->view->open_tag("placed");

			foreach ($placed as $token) {
				$match = $library[0]["id"];
				$distance = PHP_INT_MAX;

				foreach ($library as $t) {
					$dist = levenshtein($token["type"], $t["name"]);
					if ($dist < $distance) {
						$match = $t["id"];
						$distance = $dist;
					}
				}

				$token["match"] = $match;
				$this->view->record($token, "token");
			}
			$this->view->close_tag();

			$this->view->open_tag("library");
			foreach ($library as $token) {
				$this->view->record($token, "token");
			}
			$this->view->close_tag();

			$this->view->close_tag();

			return true;
		}

		private function show_resources() {
			if (($maps = $this->model->get_resources("", false)) == false) {
				return false;
			}

			foreach ($maps as $map) {
				$this->view->add_tag("image", $map);
			}
		}

		public function execute() {
			$this->view->title = "Your adventures";

			if ($this->page->ajax_request) {
				$this->show_resources();
			} else if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Save adventure") {
					/* Save adventure
					 */
					if ($this->model->save_okay($_POST) == false) {
						$this->show_adventure_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create adventure
						 */
						if ($this->model->create_adventure($_POST) === false) {
							$this->view->add_message("Error creating adventure.");
							$this->show_adventure_form($_POST);
						} else {
							$new_adventure_id = $this->db->last_insert_id;
							$_SESSION["edit_adventure_id"] = $new_adventure_id;

							$this->user->log_action("adventure %d created", $new_adventure_id);

							$this->view->add_tag("result", "Adventure created.");
							header("Location: /vault/map?first");
						}
					} else {
						/* Update adventure
						 */
						if ($this->model->update_adventure($_POST) === false) {
							$this->view->add_message("Error updating adventure.");
							$this->show_adventure_form($_POST);
						} else {
							$this->user->log_action("adventure %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Delete adventure") {
					/* Delete adventure
					 */
					if ($this->model->delete_okay($_POST) == false) {
						$this->show_adventure_form($_POST);
					} else if ($this->model->delete_adventure($_POST["id"]) === false) {
						$this->view->add_message("Error deleting adventure.");
						$this->show_adventure_form($_POST);
					} else {
						$this->user->log_action("adventure %d deleted", $_POST["id"]);
						$this->show_overview();
						if ($_POST["id"] == ($_SESSION["edit_adventure_id"] ?? null)) {
							unset($_SESSION["edit_adventure_id"]);
						}
					}
				} else if ($_POST["submit_button"] == "Export adventure") {
					/* Export adventure
					 */
					if (($export = $this->model->export_adventure($_POST["id"])) === false) {
						$this->view->add_message("Error exporting adventure.");
						$this->show_overview();
					} else {
						$this->view->disable();

						$filename = $this->model->generate_filename($_POST["title"]).".cva";
						header("Content-Type: application/x-binary");
						header("Content-Disposition: attachment; filename=\"".$filename."\"");
						print $export;
					}
				} else if (($_POST["submit_button"] == "Import adventure") && is_true(ENABLE_MARKET)) {
					/* Import adventure
					 */
					if (isset($_POST["tokens"]) == false) {
						$token_selector = $this->show_adventure_token_selector($_POST["adventure"]);
					} else {
						$token_selector = false;
					}

					if ($token_selector) {
						/* Do nothing else */
					} else if ($this->model->import_adventure($_POST) == false) {
						$this->show_market();
					} else {
						$this->user->log_action("market adventure %s imported", $_POST["adventure"]);
						$this->show_overview();
					}
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "new")) {
				/* New adventure
				 */
				$adventure = array("access" => 1);
				$this->show_adventure_form($adventure);
			} else if ($this->page->parameter_value(0, "market") && is_true(ENABLE_MARKET)) {
				/* Show market
				 */
				$this->show_market();
			} else if ($this->page->parameter_numeric(0)) {
				/* Edit adventure 
				 */
				if (($adventure = $this->model->get_adventure($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "Adventure not found.");
				} else {
					$this->show_adventure_form($adventure);
				}
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
