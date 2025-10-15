<?php
	/* Cyberpunk Red rule system
	 */
	class cyberpunkred_rule_system extends rule_system {
		protected $modules = array(RS_HITPOINTS, RS_ARMOR_CLASS, RS_COMBAT_TRACKER);

		protected $armor_class_label = 'Evasion';
		protected $initiative_label = "Reflexes";
		protected $character_options_custom = array("Dexterity");

		protected $javascripts_adventure = array("cyberpunkred");
		protected $javascripts_map_arrange = array("cyberpunkred_vault");

		public function character_valid_values($character) {
			$result = true;

			if ($this->valid_number($character["hitpoints"], "Hit points", 1, 100) == false) {
				$result = false;
			}

			if ($this->valid_number($character["initiative"], $this->initiative_label, 0, 10) == false) {
				$result = false;
			}

			return $result;
		}

		public function post_save_stats() {
			if (substr($_POST["instance_id"], 0, 5) != "token") {
				$this->view->add_tag("result", 400);
				return;
			}

			$instance_id = substr($_POST["instance_id"], 5);

			$query = "select dm_id from adventures a, maps m, map_token t ".
			         "where a.id=m.adventure_id and m.id=t.map_id and t.id=%d";

			if (($result = $this->db->execute($query, $instance_id)) == false) {
				$this->view->add_tag("result", 500);
				return;
			}

			if ($result[0]["dm_id"] != $this->user->id) {
				$this->view->add_tag("result", 401);
				return;
			}

			$data = array(
				"hitpoints"   => $_POST["hitpoints"],
				"armor_class" => $_POST["evasion"],
				"custom0"     => $_POST["reflexes"],
				"custom1"     => $_POST["dexterity"]);

			if ($this->db->update("map_token", $instance_id, $data) === false) {
				$this->view->add_tag("result", 500);
				return;
			}

			$this->view->add_tag("result", 200);
		}
	}
?>
