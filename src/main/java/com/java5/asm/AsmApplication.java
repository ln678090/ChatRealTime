package com.java5.asm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AsmApplication {
    // hihi
    static void main(String[] args) {
        SpringApplication.run(AsmApplication.class, args);
    }

}
