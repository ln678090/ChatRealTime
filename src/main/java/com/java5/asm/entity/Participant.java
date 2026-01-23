package com.java5.asm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "participants")
public class Participant {
    @EmbeddedId
    private ParticipantId id;

    @MapsId("conversationId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull
    @ColumnDefault("now()")
    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt;

    @Size(max = 20)
    @NotNull
    @ColumnDefault("'MEMBER'")
    @Column(name = "role", nullable = false, length = 20)
    private String role;


}