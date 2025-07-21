<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class agenda_model extends Banshee\model {
		public function get_resources_key($organisation_id) {	
			$query = "select resources_key from organisations where id=%d";

			if (($result = $this->db->execute($query, $organisation_id)) == false) {
				return false;
			}

			return $result[0]["resources_key"];
		}

		private function get_appointments($organisation_id, $start) {
			$query = "select a.*, d.dm_id, UNIX_TIMESTAMP(begin) as begin, UNIX_TIMESTAMP(end) as end, d.title as adventure ".
			         "from users u, agenda a left join adventures d on a.adventure_id=d.id ".
			         "where a.user_id=u.id and u.organisation_id=%d and (begin>=%s or end>=%s) order by begin,end";

			return $this->db->execute($query, $organisation_id, $start, $start);
		}

		public function get_appointments_from_today() {
			return $this->get_appointments($this->user->organisation_id, date("Y-m-d 00:00:00"));
		}

		public function get_appointments_from_this_month($organisation_id) {
			return $this->get_appointments($organisation_id, date("Y-m-1 00:00:00"));
		}

		public function get_appointments_for_month($month, $year) {
			$begin_timestamp = $this->monday_before($month, $year);
			$begin = date("Y-m-d 00:00:00", $begin_timestamp - 6 * DAY);

			$end_timestamp = $this->sunday_after($month, $year);
			$end = date("Y-m-d 23:59:59", $end_timestamp + 6 * DAY);

			$query = "select a.*, d.dm_id, UNIX_TIMESTAMP(begin) as begin, UNIX_TIMESTAMP(end) as end, d.title as adventure ".
			         "from users u, agenda a left join adventures d on a.adventure_id=d.id ".
					 "where ((begin>=%s and begin<%s) or (end>=%s and end<%s) or (begin<%s and end>=%s)) ".
			         "and a.user_id=u.id and u.organisation_id=%d order by begin";

			return $this->db->execute($query, $begin, $end, $begin, $end, $begin, $end, $this->user->organisation_id);
		}

		public function monday_before($month, $year) {
			$timestamp = strtotime($year."-".$month."-01 00:00:00");
			$dow = date("N", $timestamp) - 1;
			$timestamp -= $dow * DAY;

			return $timestamp;
		}

		public function sunday_after($month, $year) {
			$timestamp = strtotime($year."-".$month."-01 00:00:00 +1 month") - DAY;
			if (($dow = date("N", $timestamp)) < 7) {
				$timestamp += (7 - $dow) * DAY;
			}

			return $timestamp;
		}
	}
?>
