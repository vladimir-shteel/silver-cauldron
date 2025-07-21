<?php
	require "adventure.php";

	class spectate_model extends adventure_model {
		public function get_adventures() {
			$query = "select a.*, u.fullname as dm, o.resources_key, ".
			         "(select count(*) from maps where adventure_id=a.id) as maps ".
			         "from adventures a, users u, organisations o ".
			         "where a.dm_id=u.id and u.organisation_id=o.id";
			$args = array();

			if ($this->user->is_admin == false) {
				$query .= " and access>=%d and o.id=%d";
				array_push($args, ADVENTURE_ACCESS_PLAYERS_SPECTATORS, $this->user->organisation_id);
			}

			$query .= " having maps>0 order by last_login desc";

			return $this->db->execute($query, $args);
		}

		public function get_adventure($adventure_id) {
			$query = "select a.*, u.fullname as dm, o.resources_key ".
			         "from adventures a, users u, organisations o ".
			         "where a.id=%d and a.dm_id=u.id and u.organisation_id=o.id";
			$args = array($adventure_id);

			if ($this->user->is_admin == false) {
				$query .= " and access>=%d and o.id=%d";
				array_push($args, ADVENTURE_ACCESS_PLAYERS_SPECTATORS, $this->user->organisation_id);
			}

			if (($adventures = $this->db->execute($query, $args)) == false) {
				return false;
			}

			return $adventures[0];
		}
	}
?>
