--
-- Data Definition Queries
--
-- To apply changes to Docker MySQL volume, run
--     docker-compose down -v && docker-compose up
--

SET FOREIGN_KEY_CHECKS = 0;

--
-- Table structure for table `users`
--
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(10) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE (`email`),
  CHECK (`role` IN ('admin', 'instructor', 'student'))
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8;

--
-- Dumping data for table `users`
--
INSERT INTO `users`
  (`id`, `name`, `email`, `password`, `role`)
VALUES
  (1, 'Admin', 'admin@tarpaulin.com', '$2a$08$Y00/JO/uN9n0dHKuudRX2eKksWMIHXDLzHWKuz/K67alAYsZRRike', 'admin'),
  (2, 'Phi Luu', 'luuph@oregonstate.edu', '$2a$08$Y2IHnr/PU9tzG5HKrHGJH.zH3HAvlR5i5puD5GZ1sHA/mVrHKci72', 'student'),
  (3, 'Rob Hess', 'hessro@oregonstate.edu', '$2a$08$WvRkJm.bz3zoRnmA.aQZBewLopoe00nA4qbzbnLyS4eRbm2MFNkMO', 'instructor'),
  (4, 'Julianne Schutfort', 'schutfoj@oregonstate.edu', '$2a$08$bAKRXPs6fUPhqjZy55TIeO1e.aXud4LD81awrYncaCKJoMsg/s0c.', 'instructor'),
  (5, 'Khuong Luu', 'luukh@oregonstate.edu', '$2a$08$FBStm3plzBCnh/MPIUsJ0.f7kJkp6aH47haXHb3HY.Gfygan7e8He', 'student'),
  (6, 'Aidan Grimshaw', 'grimshaa@oregonstate.edu', '$2a$08$q8njvTTel9JDR.BQbb1cD.XL73CR.QCOXLnofdpd9orbv0dzWGir.', 'student'),
  (7, 'Mitchell Schenk', 'schenkmi@oregonstate.edu', '$2a$08$U7IXbbolDIk0SRlmH/dnT.FBCvf.EMvorShGlM65XeQFr./P0rhqe', 'student'),
  (8, 'Calvin Gagliano', 'gaglianc@oregonstate.edu', '$2a$08$Kb1f8JbT/9kl.wRuRsRoYO19ddMcc79zXvfUcwchJJ1qHxVMDJN1K', 'student'),
  (9, 'Henry Peterson', 'peterhen@oregonstate.edu', '$2a$08$ALw6f6NIpdptAUhhezTjhezjjnMLcbBP/uRnqVCwYNSWBdno6y2I6', 'student'),
  (10, 'Benjamin Brewster', 'brewsteb@oregonstate.edu', '$2a$08$64je8REF7I4j4bQuJKIdXO09VkCXJqoaF18znHs/a3zuKi/olDR/S', 'instructor'),
  (11, 'Hannah Scott', 'hannah.scott@oregonstate.edu', '$2a$08$Ev.K7sU3yWrCUECK2O2a5.eA8mbvVEImv/EyYka1yhRxQFKIbxrfS', 'instructor'),
  (12, 'Aiden Nelson', 'nelsonai@oregonstate.edu', '$2a$08$ljdJ4mrSIEXsaiEMu29xUuEFAOj43gL5rcR7wCq8Rl2z/bqzf.xuC', 'student'),
  (13, 'David Bolden', 'david.bolden@oregonstate.edu', '$2a$08$Apk5L0bDogb4G6ZtoKluPeZXCxye0qdNZCah9TJX9QvdRqZ5hwWAy', 'instructor'),
  (14, 'Anish Asrani', 'asrania@oregonstate.edu', '$2a$08$5SL3bkbe5S1WnE6rWciiX.9HAfXG/UGbZAQU7K0S4XTNGIHapPBy2', 'student'),
  (15, 'Sinisa Todorovic', 'sinisa@oregonstate.edu', '$2a$08$xIku71t6OFFN9Ztil1Kh2eQWk/0lC8C.UThx3PwAwYCSMxdzpPhTO', 'instructor'),
  (16, 'Thomas Noelcke', 'noelcket@oregonstate.edu', '$2a$08$H9dDFONytVUgh2ZcCQlHL.8uP6RricbtoCk2vsr/roTBtGkYLUivS', 'student'),
  (17, 'Kai Lu', 'kai.lu@oregonstate.edu', '$2a$08$pJFEMJNiTa7azhokPUnXZusS6NMqT3eBJE45sX6Kli380PZoM2nje', 'student');

--
-- Table structure for table `courses`
--
DROP TABLE IF EXISTS `courses`;
CREATE TABLE `courses` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `subject` VARCHAR(4) NOT NULL,
  `number` VARCHAR(4) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `term` VARCHAR(10) NOT NULL,
  `instructor_id` INT(10) UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`instructor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8;

--
-- Dumping data for table `courses`
--
INSERT INTO `courses`
  (`id`, `subject`, `number`, `title`, `term`, `instructor_id`)
VALUES
  (1, 'CS', '493', 'Cloud Application Development', 'sp19', 3),
  (2, 'CS', '325H', 'Analysis of Algorithms (Honor)', 'wi19', 4),
  (3, 'CS', '344', 'Operating Systems 1', 'wi19', 10),
  (4, 'CS', '340', 'Introduction to Databases', 'fa19', 11),
  (5, 'PAC', '287', 'Weight Training 1', 'fa18', 13),
  (6, 'CS', '261', 'Data Structures', 'wi18', 15),
  (7, 'CS', '290', 'Web Development', 'sp18', 3),
  (8, 'CS', '480', 'Translators', 'sp20', 3),
  (9, 'CS', '325', 'Analysis of Algorithms', 'wi19', 4),
  (10, 'CS', '312', 'System Administration', 'sp19', 10),
  (11, 'CS', '321', 'Introduction to Theory of Computation', 'fa19', 4),
  (12, 'CS', '321H', 'Introduction to Theory of Computation (Honor)', 'fa19', 4),
  (13, 'CS', '162', 'Introduction to Computer Science 2', 'wi18', 3),
  (14, 'HHS', '231', 'Lifetime Fitness for Health', 'fa18', 13),
  (15, 'MTH', '231', 'Elements of Discreet Mathematics', 'wi18', 3),
  (16, 'MTH', '341', 'Linear Algebra 1', 'fa19', 4),
  (17, 'CS', '444', 'Operating Systems 2', 'fa19', 10),
  (18, 'ECE', '375', 'Computer Organization and Assembly Language Programming', 'wi19', 10),
  (19, 'ECE', '271', 'Digital Logic Design', 'fa19', 15);

--
-- Table structure for table `assignments`
--
DROP TABLE IF EXISTS `assignments`;
CREATE TABLE `assignments` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `course_id` INT(10) UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `points` TINYINT(3) UNSIGNED NOT NULL,
  `due` VARCHAR(27) NOT NULL,  -- ISO 8601 Datetime
  PRIMARY KEY (`id`),
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8;

--
-- Dumping data for table `assignments`
--
INSERT INTO `assignments`
  (`id`, `course_id`, `title`, `points`, `due`)
VALUES
  (1, 1, 'Assignment 1: API Design, Implementation, and Containerization', 100, '2019-04-23T23:59:59-07:00'),
  (2, 1, 'Assignment 2: API Data Storage', 100, '2019-05-06T23:59:59-07:00'),
  (3, 1, 'Assignment 3: API Authentication and Authorization', 100, '2019-05-20T23:59:59-07:00'),
  (4, 1, 'Assignment 4: File Uploads and Offline Work', 100, '2019-06-03T23:59:59-07:00'),
  (5, 2, 'Homework 3: Dynamic Programming', 100, '2019-03-13T23:59:59-07:00'),
  (6, 3, 'Program 3: Smallsh', 100, '2019-03-05T23:59:59-08:00'),
  (7, 15, 'Homework 6', 100, '2018-04-23T23:59:59-07:00'),
  (8, 8, 'Assignment 2: Parsing and Syntax-Directed Translation', 100, '2019-05-13T23:59:59-07:00'),
  (9, 8, 'Assignment 3: Abstract Syntax Trees and Simple Code Generation', 100, '2019-05-27T23:59:59-07:00'),
  (10, 18, 'Project Step 7: Turn in Final Working Project', 100, '2019-03-19T23:59:59-07:00');

--
-- Table structure for table `submissions`
--
DROP TABLE IF EXISTS `submissions`;
CREATE TABLE `submissions` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `assignment_id` INT(10) UNSIGNED NOT NULL,
  `student_id` INT(10) UNSIGNED NOT NULL,
  `timestamp` VARCHAR(27) NOT NULL,  -- ISO 8601 Datetime
  `file` VARCHAR(256) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Table structure for table `courses_students`
-- (Since Course and Student have a many-to-many relationship)
--
DROP TABLE IF EXISTS `courses_students`;
CREATE TABLE `courses_students` (
  `course_id` INT(10) UNSIGNED NOT NULL,
  `student_id` INT(10) UNSIGNED NOT NULL,
  UNIQUE (`course_id`, `student_id`),
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `courses_students`
--
INSERT INTO `courses_students`
  (`course_id`, `student_id`)
VALUES
  (1, 2), (1, 5), (1, 6),
  (3, 1), (3, 7),
  (4, 5), (4, 8), (4, 9),
  (7, 2), (7, 5), (7, 6), (7, 7), (7, 8),
  (9, 2), (9, 6), (9, 7),(9, 8),
  (17, 5), (17, 6),
  (19, 12);

SET FOREIGN_KEY_CHECKS = 1;
