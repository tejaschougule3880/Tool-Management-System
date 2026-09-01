package com.tms.toolmanagementsystem.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class DBConnection {

    public static void ensureToolInstanceSerialIndex() {
        try (Connection con = getConnection();
             Statement stmt = con.createStatement()) {

            String indexCheckSql = "SELECT index_name, GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns " +
                    "FROM information_schema.statistics " +
                    "WHERE table_schema = DATABASE() AND table_name = 'tool_instance' " +
                    "GROUP BY index_name";

            boolean hasLegacySerialIndex = false;
            boolean hasCompositeSerialIndex = false;

            try (ResultSet rs = stmt.executeQuery(indexCheckSql)) {
                while (rs.next()) {
                    String indexName = rs.getString("index_name");
                    String columns = rs.getString("columns");
                    if ("serial_number".equals(indexName) || "serial_number_2".equals(indexName)) {
                        hasLegacySerialIndex = true;
                    }
                    if ("tool_id,serial_number".equals(columns) || "serial_number,tool_id".equals(columns)) {
                        hasCompositeSerialIndex = true;
                    }
                }
            }

            if (hasLegacySerialIndex && !hasCompositeSerialIndex) {
                try (PreparedStatement dropLegacy = con.prepareStatement("ALTER TABLE tool_instance DROP INDEX serial_number")) {
                    dropLegacy.execute();
                } catch (SQLException ignored) {
                    // The legacy name may already be serial_number_2 or not present in this schema version.
                }

                try (PreparedStatement dropLegacy2 = con.prepareStatement("ALTER TABLE tool_instance DROP INDEX serial_number_2")) {
                    dropLegacy2.execute();
                } catch (SQLException ignored) {
                    // The second legacy index is optional depending on the schema.
                }

                try (PreparedStatement addComposite = con.prepareStatement(
                        "ALTER TABLE tool_instance ADD UNIQUE KEY uq_tool_serial (tool_id, serial_number)")) {
                    addComposite.execute();
                }
            } else if (!hasLegacySerialIndex && !hasCompositeSerialIndex) {
                try (PreparedStatement addComposite = con.prepareStatement(
                        "ALTER TABLE tool_instance ADD UNIQUE KEY uq_tool_serial (tool_id, serial_number)")) {
                    addComposite.execute();
                }
            }
        } catch (SQLException e) {
            // Ignore migration issues during startup; the app will still attempt the insert using the current schema.
            e.printStackTrace();
        }
    }

    public static Connection getConnection() throws SQLException {
        String url = firstNonBlank(
                System.getenv("DB_URL"),
                System.getenv("DATABASE_URL"),
                System.getenv("MYSQL_URL"),
                System.getenv("SPRING_DATASOURCE_URL"),
                "jdbc:mysql://localhost:3306/tool_management"
        );
        String user = firstNonBlank(
                System.getenv("DB_USER"),
                System.getenv("DB_USERNAME"),
                System.getenv("MYSQLUSER"),
                System.getenv("SPRING_DATASOURCE_USERNAME"),
                "root"
        );
        String password = firstNonBlank(
                System.getenv("DB_PASSWORD"),
                System.getenv("DB_PASS"),
                System.getenv("MYSQLPASSWORD"),
                System.getenv("SPRING_DATASOURCE_PASSWORD"),
                "admin"
        );

        if (url != null && url.startsWith("mysql://")) {
            url = "jdbc:" + url;
        }

        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            return DriverManager.getConnection(url, user, password);
        } catch (ClassNotFoundException e) {
            throw new SQLException("MySQL Driver not found", e);
        }
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value;
            }
        }
        return null;
    }
}
