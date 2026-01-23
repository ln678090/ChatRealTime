package com.java5.asm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

@Getter
@Setter
@EqualsAndHashCode
@Embeddable
public class ParticipantId implements Serializable {
    private static final long serialVersionUID = -8991549589874035550L;
    @NotNull
    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @NotNull
    @Column(name = "user_id", nullable = false)
    private UUID userId;


}