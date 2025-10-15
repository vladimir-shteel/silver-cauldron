<?php
	/* Template rule system
	 */
	class template_system extends rule_system {
		protected $modules = array(RS_HITPOINTS, RS_ARMOR_CLASS, RS_COMBAT_TRACKER, RS_SPELL_EFFECT_AREA);

		protected $adventure_custom_values = array();

		protected $character_options_custom = array("Custom");
		protected $armor_class_label = "Armor class";
		protected $initiative_label = "Initiative bonus";

		protected $javascripts_adventure = array("template");
		protected $javascripts_map_arrange = array("template_vault");

		protected $conditions = array("condition");

		public function character_valid_values($character) {
			$result = true;

			if ($this->valid_number($character["hitpoints"], "Hit points", 1, 65000) == false) {
				$result = false;
			}

			if ($this->valid_number($character["armor_class"], $this->armor_class_label, 1, 250) == false) {
				$result = false;
			}

			if ($this->valid_number($character["initiative"], $this->initiative_label, -5, 10) == false) {
				$result = false;
			}

			return $result;
		}
	}
?>
