<?php
	const RS_ARMOR_CLASS = 1;
	const RS_COMBAT_TRACKER = 2;
	const RS_HITPOINTS = 3;
	const RS_SPELL_EFFECT_AREA = 4;

	abstract class rule_system {
		protected $db = null;
		protected $user = null;
		protected $view = null;
		private $info = array();

		protected $modules = array();

		protected $adventure_custom_values = array();

		private $character_options = array();
		protected $character_options_custom = array();
		protected $conditions = array();
		protected $include_generic_conditions = true;

		protected $armor_class_label = "Armor class";
		protected $initiative_label = "Initiative bonus";

		protected $javascripts_adventure = array();
		protected $javascripts_map_arrange = array();
		protected $stylesheets_adventure = array();

		public function __construct($db, $user, $view, $info) {
			$this->db = $db;
			$this->user = $user;
			$this->view = $view;
			$this->info = $info;

			if (in_array(RS_ARMOR_CLASS, $this->modules)) {
				array_push($this->character_options, "armor_class");
				array_push($this->javascripts_adventure, "armor_class");
				array_push($this->javascripts_map_arrange, "armor_class_vault");
			}

			if (in_array(RS_COMBAT_TRACKER, $this->modules)) {
				array_push($this->character_options, "initiative");
				array_push($this->javascripts_adventure, "combat_tracker");
				array_push($this->stylesheets_adventure, "combat_tracker");
			}

			if (in_array(RS_HITPOINTS, $this->modules)) {
				array_push($this->character_options, "hitpoints");
				array_push($this->javascripts_adventure, "hitpoints");
				array_push($this->javascripts_map_arrange, "hitpoints_vault");
			}

			if (in_array(RS_SPELL_EFFECT_AREA, $this->modules)) {
				array_push($this->javascripts_adventure, "spell_effect_area");
			}

			if (count($this->conditions) > 0) {
				array_push($this->javascripts_adventure, "conditions");
			}
		}

        public function __get($key) {
			switch ($key) {
				case "id":
				case "name":
				case "code": return $this->info[$key];
				case "adventure_custom_values": return $this->adventure_custom_values;
				case "character_options": return $this->character_options;
				case "character_options_custom": return $this->character_options_custom;
				case "armor_class_label": return $this->armor_class_label;
				case "initiative_label": return $this->initiative_label;
				case "conditions":
					$conditions = $this->conditions;
					if ($this->include_generic_conditions) {
						$conditions = array_merge($conditions, CONDITIONS_GENERIC);
					}

					$result = array();
					foreach ($conditions as $i => $condition) {
						array_push($result, array(
							"id"   => ($i + 1),
							"name" => $condition));
					}

					return $result;
			}

			return null;
		}

		protected function valid_number($number, $label, $min = null, $max = null) {
			if (is_numeric($number) == false) {
				$this->view->add_message("Invalid ".strtolower($label).".");
				return false;
			}

			if (($min !== null) && ($number < $min)) {
				$this->view->add_message($label." is too low.");
				return false;
			}

			if (($max !== null) && ($number > $max)) {
				$this->view->add_message($label." is too high.");
				return false;
			}

			return true;
		}

		public function character_valid_values($character) {
			return true;
		}

		public function adventure_created($adventure_id) {
			return true;
		}

		private function info_to_view() {
			$this->view->open_tag("rule_system", array("id" => $this->info["id"]));
			$this->view->add_tag("name", $this->info["name"]);
			$this->view->add_tag("code", $this->info["code"]);
			$this->view->add_tag("armor_class_label", $this->armor_class_label);
			$this->view->add_tag("initiative_label", $this->initiative_label);
			$this->view->close_tag();
		}

		public function start_adventure() {
			$this->info_to_view();

			$this->view->add_javascript("rule_system.js");
			foreach ($this->javascripts_adventure as $javascript) {
				$this->view->add_javascript("rule_systems/".$javascript.".js");
			}

			foreach ($this->stylesheets_adventure as $stylesheet) {
				$this->view->add_css("includes/".$stylesheet.".css");
			}
		}

		public function start_map_arrange() {
			$this->info_to_view();

			$this->view->add_javascript("rule_system.js");
			foreach ($this->javascripts_map_arrange as $javascript) {
				$this->view->add_javascript("rule_systems/".$javascript.".js");
			}
		}
	}
?>
