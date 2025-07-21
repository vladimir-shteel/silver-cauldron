<?php
	class cauldron_controller extends Banshee\controller {
		private $adventures = null;

		protected function adventures_pulldown_init($all = false) {
			if (($this->adventures = $this->model->get_my_adventures($all)) === false) {
				$this->view->add_tag("result", "Database error.");
				return false;
			}

			if (count($this->adventures) == 0) {
				$this->view->add_tag("result", "Create an adventure first.", array("url" => "vault/adventure/new"));
				return false;
			}

			if (isset($_SESSION["edit_adventure_id"]) == false) {
				$_SESSION["edit_adventure_id"] = $this->adventures[0]["id"];
			}

			return true;
		}

		protected function adventures_pulldown_show() {
			$this->view->add_css("includes/adventures_pulldown.css");

			$this->view->open_tag("adventures_pulldown");
			foreach ($this->adventures as $adventure) {
				$attr = array(
					"id"       => $adventure["id"],
					"selected" => show_boolean($adventure["id"] == $_SESSION["edit_adventure_id"]));
				$this->view->add_tag("adventure", $adventure["title"], $attr);
			}
			$this->view->close_tag();
		}

		protected function adventures_pulldown_changed() {
			if ($_POST["submit_button"] == "Change adventure") {
#				if ($this->model->is_my_adventure($_POST["adventure"])) {
					$_SESSION["edit_adventure_id"] = $_POST["adventure"];
#				}
			}
		}
	}
?>
