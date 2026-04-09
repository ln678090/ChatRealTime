package com.java5.asm.config.cloud.dto;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ConnectHubApiResp<T> {
    private String message;
    private T data;
    private String timestamp;
}