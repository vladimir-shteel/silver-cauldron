<?php
	class basic_rule_system extends rule_system {
		protected $modules = array(RS_HITPOINTS, RS_COMBAT_TRACKER);

		public function character_valid_values($character) {
			$result = true;

			if ($this->valid_number($character["hitpoints"], "Hit points", 1, 1000) == false) {
				$result = false;
			}

			if ($this->valid_number($character["initiative"], "Initiative bonus", -20, 20) == false) {
				$result = false;
			}

			return $result;
		}
	}
?>
