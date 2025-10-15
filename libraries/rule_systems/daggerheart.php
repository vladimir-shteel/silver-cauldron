<?php
	/* Daggerheart rule system
	 *
	 * custom 0: stress
	 * custom 1: hope
	 */
	class daggerheart_rule_system extends rule_system {
		protected $modules = array(RS_HITPOINTS, RS_ARMOR_CLASS, RS_SPELL_EFFECT_AREA);

		protected $adventure_custom_values = array(0);

		protected $character_options_custom = array("Stress", "Hope");
		protected $armor_class_label = "Evasion";
		protected $conditions = array("hidden", "restrained", "vulnerable");

		protected $javascripts_adventure = array("daggerheart");

		public function character_valid_values($character) {
			$result = true;

			if ($this->valid_number($character["hitpoints"], "Hit points", 1, 12) == false) {
				$result = false;
			}

			if ($this->valid_number($character["armor_class"], $this->armor_class_label, 1, 20) == false) {
				$result = false;
			}

			if ($this->valid_number($character["custom0"], $this->character_options_custom[0], 0, 12) == false) {
				$result = false;
			}

			if ($this->valid_number($character["custom1"], $this->character_options_custom[1], 0, 6) == false) {
				$result = false;
			}

			return $result;
		}

		public function adventure_created($adventure_id) {
			return $this->db->update("adventures", $adventure_id, array("custom0" => 0)) !== false;
		}
	}
?>
