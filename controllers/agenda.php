<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class agenda_controller extends Banshee\controller {
		private function show_month($month = null, $year = null) {
			if ($month == null) {
				$month = (int)date_string("m");
			}

			if ($year == null) {
				$year = (int)date("Y");
			}

			if (($appointments = $this->model->get_appointments_for_month($month, $year)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->add_javascript("banshee/jquery.windowframe.js");
			$this->view->add_javascript("agenda.js");

			$day = $this->model->monday_before($month, $year);
			$last_day = $this->model->sunday_after($month, $year);
			$today = strtotime("today 00:00:00");

			$months_of_year = config_array(MONTHS_OF_YEAR);
			$this->view->open_tag("month", array("title" => $months_of_year[$month - 1]." ".$year));

			/* Links
			 */
			$y = $year;
			if (($m = $month - 1) == 0) {
				$m = 12;
				$y--;
			}
			$this->view->add_tag("prev", $y."/".$m);

			$y = $year;
			if (($m = $month + 1) == 13) {
				$m = 1;
				$y++;
			}
			$this->view->add_tag("next", $y."/".$m);

			/* Days of week
			 */
			$days_of_week = config_array(DAYS_OF_WEEK);
			$this->view->open_tag("days_of_week");
			foreach ($days_of_week as $dow) {
				if ($this->view->mobile) {
					$dow = substr($dow, 0, 3);
				}
				$this->view->add_tag("day", $dow);
			}
			$this->view->close_tag();

			/* Weeks
			 */
			while ($day < $last_day) {
				$this->view->open_tag("week");
				for ($dow = 1; $dow <= 7; $dow++) {
					$params = array("nr" => date_string("j", $day), "dow" => $dow);
					if ($day == $today) {
						$params["today"] = " today";
					}
					$this->view->open_tag("day", $params);

					foreach ($appointments as $appointment) {
						if ($appointment["end"] != "") {
							$end = date_string("l, j F Y, H:i", $appointment["end"]);
						} else {
							$end = "";
						}
						$attr = array(
							"id"        => $appointment["id"],
							"begin"     => date_string("l, j F Y, H:i", $appointment["begin"]),
							"end"       => $end,
							"adventure" => $appointment["adventure"]);
						if (($appointment["begin"] >= $day) && ($appointment["begin"] < $day + DAY)) {
							$this->view->add_tag("appointment", $appointment["title"], $attr);
						} else if (($appointment["begin"] < $day) && ($appointment["end"] >= $day)) {
							$this->view->add_tag("appointment", "... ".$appointment["title"], $attr);
						}
					}
					$this->view->close_tag();

					$day = strtotime(date_string("d-m-Y", $day)." +1 day");
				}
				$this->view->close_tag();
			}
			$this->view->close_tag();
		}

		private function show_icalendar() {
			if ($this->user->logged_in) {
				$organisation_id = $this->user->organisation_id;
			} else if ($this->page->parameter_numeric(0) && $this->page->parameter_value(1)) {
				if (($resources_key = $this->model->get_resources_key($this->page->parameters[0])) == false) {
					return false;
				}

				if ($this->page->parameters[1] != substr($resources_key, 0, AGENDA_KEY_LENGTH)) {
					return false;
				}
				
				$organisation_id = $this->page->parameters[0];
			} else {
				return false;
			}

			if (($appointments = $this->model->get_appointments_from_this_month($organisation_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$ical = new \Banshee\Protocol\iCalendar("RPG agenda", "CauldronVTT//NL");

			foreach ($appointments as $appointment) {
				if ($appointment["end"] == "") {
					$appointment["end"] = strtotime(date("Y-m-d 23:59:59", $appointment["begin"]));
				}

				$ical->add_item($appointment["title"], $appointment["adventure"], $appointment["begin"], $appointment["end"]);
			}

			$ical->to_view($this->view);

			return true;
		}

		public function execute() {
			if ($this->page->type == "ics") {
				if ($this->show_icalendar() == false) {
					$this->view->disable();
					header("Status: 403");
				}
				return;
			}

			$this->view->description = "Agenda";
			$this->view->keywords = "agenda";
			$this->view->title = "Agenda";
			
			$this->view->add_help_button();
			$link = "https://".$_SERVER["SERVER_NAME"]."/agenda.ics/".$this->user->organisation_id.
			        "/".substr($this->user->resources_key, 0, AGENDA_KEY_LENGTH);
			$this->view->add_tag("link", $link);

			if (isset($_SESSION["calendar_month"]) == false) {
				$_SESSION["calendar_month"] = (int)date_string("m");
				$_SESSION["calendar_year"]  = (int)date("Y");
			}

			if ($this->page->parameter_value(0, "list")) {
				/* Show appointment list
				 */
				if (($appointments = $this->model->get_appointments_from_today()) === false) {
					$this->view->add_tag("result", "Database error.");
				} else {
					$this->view->open_tag("list");
					foreach ($appointments as $appointment) {
						$appointment["begin"] = date_string("l, j F Y, H:i", $appointment["begin"]);
						if ($appointment["end"] != null) {
							$appointment["end"] = date_string("l, j F Y, H:i", $appointment["end"]);
						}

						$this->view->record($appointment, "appointment");
					}
					$this->view->close_tag();
				}
			} else if ($this->page->parameter_numeric(0) && $this->page->parameter_numeric(1)) {
				/* Show specific month
				 */
				$year = (int)$this->page->parameters[0];
				if (($year < 1902) && ($year > 2037)) {
					$year = null;
				}

				$month = (int)$this->page->parameters[1];
				if (($month < 1) || ($month > 12)) {
					$month = null;
				}

				$this->show_month($month, $year);
			} else {
				/* Show current month
				 */
				$this->show_month();
			}
		}
	}
?>
